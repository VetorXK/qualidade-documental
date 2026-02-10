import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { NormalizedRow, Filters } from './types'
import { pointsFor, isError } from './scoring'
import { buildWhere } from './db'
import { hoStatus } from './ho'

type Env = {
  DB: D1Database
  ALLOWED_ORIGINS: string
}

function uid() {
  return crypto.randomUUID()
}

function norm(v: any): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length ? s : null
}

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS || '*'
  const origins = allowed === '*' ? ['*'] : allowed.split(',').map(s => s.trim()).filter(Boolean)
  return cors({
    origin: origins[0] === '*' ? '*' : origins,
    allowHeaders: ['content-type'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86400,
  })(c, next)
})

app.get('/api/health', (c) => c.json({ ok: true }))

app.post('/api/import', async (c) => {
  const body = await c.req.json<{ importLabel: string, rows: NormalizedRow[] }>()
  const importedAt = new Date().toISOString()

  if (!body?.rows?.length) return c.text('Sem linhas para importar', 400)
  const importLabel = body.importLabel || `Import ${importedAt}`

  // Insert in chunks
  const chunkSize = 300
  for (let i = 0; i < body.rows.length; i += chunkSize) {
    const chunk = body.rows.slice(i, i + chunkSize)
    const stmts = chunk.map((r) => {
      const status = norm(r.status)
      const sev = norm(r.severidade)
      const pts = pointsFor(status, sev)
      return c.env.DB.prepare(`
        INSERT INTO qa_rows (id, imported_at, import_label, data, adesao, operador, grupo, status, manifesto, severidade, pontos)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        uid(), importedAt, importLabel,
        norm(r.data),
        norm(r.adesao),
        norm(r.operador),
        norm(r.group),
        status,
        norm(r.manifesto),
        sev,
        pts
      )
    })
    await c.env.DB.batch(stmts)
  }

  return c.json({ ok: true, importedAt, importLabel, inserted: body.rows.length })
})

app.get('/api/dashboard', async (c) => {
  const q = c.req.query()
  const filters: Filters = {
    dateFrom: q.dateFrom,
    dateTo: q.dateTo,
    adesao: q.adesao,
    operador: q.operador,
    group: q.group,
    severidade: q.severidade,
    minPoints: q.minPoints,
    maxPoints: q.maxPoints
  }

  const { clause, args } = buildWhere(filters)

  // KPIs
  const kpi = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as total,
      AVG(pontos)/100.0 as avg_quality
    FROM qa_rows
    ${clause}
  `).bind(...args).first<any>()

  const total = Number(kpi?.total || 0)
  const avgQuality = Number(kpi?.avg_quality || 0)

  // Analysts aggregation
  const rows = await c.env.DB.prepare(`
    SELECT
      COALESCE(operador, '(Sem operador)') as operador,
      COUNT(*) as total,
      AVG(pontos)/100.0 as avg_quality,
      SUM(CASE WHEN upper(status) LIKE '%NAO%' AND upper(status) LIKE '%CONFERE%' THEN 1 ELSE 0 END) as errors
    FROM qa_rows
    ${clause}
    GROUP BY operador
    ORDER BY total DESC, avg_quality DESC
  `).bind(...args).all<any>()

  const analysts = (rows.results || []).map((r: any, idx: number) => {
    const prodRank = idx + 1
    const avgQ = Number(r.avg_quality || 0)
    return {
      operador: r.operador,
      total: Number(r.total || 0),
      avgQuality: avgQ,
      errors: Number(r.errors || 0),
      prodRank,
      hoStatus: hoStatus(avgQ, prodRank)
    }
  })

  const hoOk = analysts.filter(a => a.hoStatus === 'HO').length
  const hoPresencial = analysts.filter(a => a.hoStatus === 'PRESENCIAL').length

  return c.json({
    filters,
    kpis: {
      totalAnalyses: total,
      avgQuality,
      hoOk,
      hoPresencial
    },
    analysts
  })
})

app.post('/api/snapshots', async (c) => {
  const body = await c.req.json<{ name: string, filters: Filters }>()
  const name = (body?.name || '').trim()
  if (!name) return c.text('Nome do snapshot é obrigatório', 400)

  // materializa dashboard com os filtros atuais
  const url = new URL(c.req.url)
  for (const [k, v] of Object.entries(body.filters || {})) {
    if (v) url.searchParams.set(k, String(v))
  }

  // Reutiliza a própria rota /api/dashboard
  const dashRes = await app.request(url.origin + '/api/dashboard?' + url.searchParams.toString(), {
    method: 'GET',
    headers: c.req.raw.headers
  }, c.env)

  const dashboard = await dashRes.json<any>()
  const id = uid()
  const createdAt = new Date().toISOString()

  await c.env.DB.prepare(`
    INSERT INTO qa_snapshots (id, created_at, name, filters_json, dashboard_json)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, createdAt, name, JSON.stringify(body.filters || {}), JSON.stringify(dashboard)).run()

  return c.json({ ok: true, id })
})

app.get('/api/snapshots', async (c) => {
  const res = await c.env.DB.prepare(`
    SELECT id, created_at, name
    FROM qa_snapshots
    ORDER BY datetime(created_at) DESC
    LIMIT 100
  `).all<any>()

  return c.json({ items: res.results || [] })
})

app.get('/api/snapshots/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare(`
    SELECT id, created_at, name, filters_json, dashboard_json
    FROM qa_snapshots
    WHERE id = ?
  `).bind(id).first<any>()

  if (!row) return c.text('Snapshot não encontrado', 404)

  return c.json({
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    filters: JSON.parse(row.filters_json),
    dashboard: JSON.parse(row.dashboard_json)
  })
})

export default app
