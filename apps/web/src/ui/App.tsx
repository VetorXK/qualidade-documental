import React, { useEffect, useMemo, useState } from 'react'
import { importRows, getDashboard, getRows, listSnapshots, loadSnapshot, saveSnapshot } from '../lib/api'
import { parseRelatorio } from '../lib/excel'
import type { AnalystRow, DashboardFilters } from '../lib/types'

function formatPct(v: number) {
  return (v * 100).toFixed(1) + '%'
}

function pillClass(status: string) {
  if (status === 'HO') return 'pill ok'
  if (status === 'ALERTA') return 'pill warn'
  return 'pill bad'
}

function downloadText(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [filters, setFilters] = useState<DashboardFilters>({})
  const [dash, setDash] = useState<any>(null)
  const [snaps, setSnaps] = useState<any[]>([])
  const [selectedSnap, setSelectedSnap] = useState<string>('')

  const [rowsData, setRowsData] = useState<any[]>([])
  const [rowsTotal, setRowsTotal] = useState<number>(0)
  const [rowsOffset, setRowsOffset] = useState<number>(0)
  const rowsLimit = 50

  async function refresh() {
    setBusy(true); setMsg(null)
    try {
      const d = await getDashboard(filters)
      setDash(d)
      setRowsOffset(0)
      const r = await getRows(filters, rowsLimit, 0)
      setRowsData(r.items || [])
      setRowsTotal(r.total || 0)
    } catch (e: any) {
      setMsg(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function refreshRows(offset: number) {
    setBusy(true); setMsg(null)
    try {
      const r = await getRows(filters, rowsLimit, offset)
      setRowsData(r.items || [])
      setRowsTotal(r.total || 0)
      setRowsOffset(offset)
    } catch (e:any) {
      setMsg(e?.message || String(e))
    } finally { setBusy(false) }
  }

  async function refreshSnaps() {
    try {
      const s = await listSnapshots()
      setSnaps(s.items || [])
    } catch {}
  }

  useEffect(() => { refresh(); refreshSnaps(); /* eslint-disable-next-line */ }, [])

  const analysts: AnalystRow[] = dash?.analysts || []

  const cards = useMemo(() => {
    if (!dash) return null
    return [
      { title: 'Qualidade média', value: formatPct(dash.kpis.avgQuality ?? 0), cls: 'card blue' },
      { title: 'Total de análises', value: String(dash.kpis.totalAnalyses ?? 0), cls: 'card purple' },
      { title: 'Aptos HO', value: String(dash.kpis.hoOk ?? 0), cls: 'card green' },
      { title: 'Presencial', value: String(dash.kpis.hoPresencial ?? 0), cls: 'card red' },
    ]
  }, [dash])

  return (
    <div className="container">
      <h1>Qualidade Documental</h1>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setBusy(true); setMsg(null)
              try {
                const rows = await parseRelatorio(f)
                const label = `Import ${new Date().toISOString().slice(0,10)}`
                const res = await importRows({ importLabel: label, rows })
                setMsg(`Importação concluída: ${res.inserted} linhas (de ${rows.length} lidas)`)
                await refresh()
              } catch (err: any) {
                setMsg(err?.message || String(err))
              } finally {
                setBusy(false)
                e.currentTarget.value = ''
              }
            }}
          />
          <button className="primary" disabled={busy} onClick={refresh}>Atualizar</button>
          <span className="small">Upload não é salvo. O sistema grava só os dados (histórico).</span>
        </div>

        <div className="grid cards" style={{ marginTop: 12 }}>
          {cards?.map((c) => (
            <div className={c.cls} key={c.title}>
              <div className="small">{c.title}</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h2>Filtros</h2>
        <div className="row">
          <label className="small">De <input type="date" value={filters.dateFrom || ''} onChange={(e)=>setFilters(f=>({...f, dateFrom:e.target.value}))} /></label>
          <label className="small">Até <input type="date" value={filters.dateTo || ''} onChange={(e)=>setFilters(f=>({...f, dateTo:e.target.value}))} /></label>
          <input placeholder="ADE" value={filters.adesao || ''} onChange={(e)=>setFilters(f=>({...f, adesao:e.target.value}))} />
          <input placeholder="Analista (Operador)" value={filters.operador || ''} onChange={(e)=>setFilters(f=>({...f, operador:e.target.value}))} />
          <input placeholder="Esteira/Grupo" value={filters.group || ''} onChange={(e)=>setFilters(f=>({...f, group:e.target.value}))} />
          <select value={filters.severidade || ''} onChange={(e)=>setFilters(f=>({...f, severidade:e.target.value}))}>
            <option value="">Severidade (todas)</option>
            <option value="LEVE">LEVE</option>
            <option value="MEDIO">MÉDIO</option>
            <option value="GRAVE">GRAVE</option>
            <option value="GRAVISSIMO">GRAVÍSSIMO</option>
          </select>
          <input style={{ width: 120 }} placeholder="Pontos mín" value={filters.minPoints || ''} onChange={(e)=>setFilters(f=>({...f, minPoints:e.target.value}))} />
          <input style={{ width: 120 }} placeholder="Pontos máx" value={filters.maxPoints || ''} onChange={(e)=>setFilters(f=>({...f, maxPoints:e.target.value}))} />

          <button className="primary" disabled={busy} onClick={refresh}>Aplicar</button>
          <button className="ghost" disabled={busy} onClick={()=>{ setFilters({}); setTimeout(refresh,0) }}>Limpar</button>

          <button
            disabled={!dash}
            onClick={() => {
              const rows = (dash?.analysts || []) as AnalystRow[]
              const header = 'pos,analista,propostas,qualidade,erros,status_ho\n'
              const csv = header + rows.map(r => [
                r.prodRank,
                JSON.stringify(r.operador),
                r.total,
                (r.avgQuality*100).toFixed(2),
                r.errors,
                r.hoStatus
              ].join(',')).join('\n')
              downloadText(`ranking_analistas.csv`, csv, 'text/csv')
            }}
          >Exportar ranking CSV</button>

          <button
            disabled={!dash}
            onClick={async () => {
              const name = prompt('Nome do snapshot (ex: Jan/2026 - CNC)')
              if (!name) return
              setBusy(true); setMsg(null)
              try {
                await saveSnapshot(name, filters)
                await refreshSnaps()
                setMsg('Snapshot salvo.')
              } catch (e:any) {
                setMsg(e?.message || String(e))
              } finally { setBusy(false) }
            }}
          >Salvar lista</button>

          <select value={selectedSnap} onChange={async (e) => {
            const id = e.target.value
            setSelectedSnap(id)
            if (!id) return
            setBusy(true); setMsg(null)
            try {
              const s = await loadSnapshot(id)
              setFilters(s.filters || {})
              setDash(s.dashboard || null)
              setRowsOffset(0)
              const r = await getRows(s.filters || {}, rowsLimit, 0)
              setRowsData(r.items || [])
              setRowsTotal(r.total || 0)
            } catch (err:any) {
              setMsg(err?.message || String(err))
            } finally { setBusy(false) }
          }}>
            <option value="">Abrir snapshot…</option>
            {snaps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h2>Ranking de analistas</h2>
        <div className="small">Produção = total de análises no período filtrado.</div>
        <div style={{ marginTop: 10, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Analista</th>
                <th>Propostas</th>
                <th>Qualidade</th>
                <th>Erros</th>
                <th>Status HO</th>
              </tr>
            </thead>
            <tbody>
              {analysts.map((a) => (
                <tr key={a.operador}>
                  <td>{a.prodRank}</td>
                  <td>{a.operador}</td>
                  <td>{a.total}</td>
                  <td>{formatPct(a.avgQuality)}</td>
                  <td>{a.errors}</td>
                  <td><span className={pillClass(a.hoStatus)}>{a.hoStatus}</span></td>
                </tr>
              ))}
              {!analysts.length && (
                <tr><td colSpan={6} className="small">Sem dados. Faça upload ou ajuste filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Propostas analisadas</h2>
        <div className="small">Mostrando {rowsOffset + 1}–{Math.min(rowsOffset + rowsLimit, rowsTotal)} de {rowsTotal}.</div>

        <div className="row" style={{ marginTop: 10 }}>
          <button disabled={busy || rowsOffset === 0} onClick={() => refreshRows(Math.max(0, rowsOffset - rowsLimit))}>◀ Anterior</button>
          <button disabled={busy || rowsOffset + rowsLimit >= rowsTotal} onClick={() => refreshRows(rowsOffset + rowsLimit)}>Próxima ▶</button>

          <button
            disabled={!rowsTotal}
            onClick={() => {
              const header = 'data,operador,status,adesao,manifesto,severidade,pontos\n'
              const csv = header + rowsData.map(r => [
                JSON.stringify(r.data || ''),
                JSON.stringify(r.operador || ''),
                JSON.stringify(r.status || ''),
                JSON.stringify(r.adesao || ''),
                JSON.stringify(r.manifesto || ''),
                JSON.stringify(r.severidade || ''),
                r.pontos
              ].join(',')).join('\n')
              downloadText('propostas_pagina.csv', csv, 'text/csv')
            }}
          >Exportar página CSV</button>
        </div>

        <div style={{ marginTop: 10, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Operador</th>
                <th>Status</th>
                <th>Adesão</th>
                <th>Manifesto</th>
                <th>Severidade</th>
                <th>Pontos</th>
              </tr>
            </thead>
            <tbody>
              {rowsData.map((r, idx) => (
                <tr key={r.id || idx}>
                  <td>{r.data ? new Date(r.data).toLocaleString('pt-BR') : ''}</td>
                  <td>{r.operador || ''}</td>
                  <td>{r.status || ''}</td>
                  <td>{r.adesao || ''}</td>
                  <td style={{ maxWidth: 420 }}>{r.manifesto || ''}</td>
                  <td>{r.severidade || ''}</td>
                  <td>{r.pontos}</td>
                </tr>
              ))}
              {!rowsData.length && (
                <tr><td colSpan={7} className="small">Sem linhas para mostrar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {msg && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="small">Mensagem</div>
          <div>{msg}</div>
        </div>
      )}

      <div className="small" style={{ marginTop: 12, opacity: .7 }}>
        Dica: se sua planilha tiver muita linha, o upload é enviado em blocos para não travar.
      </div>
    </div>
  )
}
