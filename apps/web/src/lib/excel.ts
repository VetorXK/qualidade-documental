import * as XLSX from 'xlsx'
import type { NormalizedRow } from './types'

function normKey(k: string) {
  return k.trim().toLowerCase()
    .replace(/\s+/g,' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function toISODate(v: any): string | null {
  if (!v) return null
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString()
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) {
      const dt = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, d.S))
      return dt.toISOString()
    }
  }
  const s = String(v).trim()
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString()
  return null
}

function clean(v: any): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length ? s : null
}

// Strategy:
// 1) Try header-based mapping (best when headers are correct).
// 2) Fallback to fixed column letters (D,F,G,J,K,V) if header mapping fails.
export function parseRelatorio(file: File): Promise<NormalizedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'))
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets['Relatorio'] || wb.Sheets['Relatório'] || wb.Sheets[wb.SheetNames[0]]
        if (!ws) throw new Error('Aba não encontrada')

        // Read as objects first
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null })

        // If header-based mapping seems broken (e.g., no "Operador" values), fallback.
        const tryHeader = () => {
          const rows: NormalizedRow[] = json.map((r) => {
            const mapped: Record<string, any> = {}
            for (const [k, v] of Object.entries(r)) mapped[normKey(k)] = v

            const status = mapped['status atendimento'] ?? mapped['status'] ?? null
            const operador = mapped['operador'] ?? mapped['analista'] ?? null
            const adesao = mapped['adesao'] ?? mapped['ade'] ?? null
            const group = mapped['grupo'] ?? mapped['esteira'] ?? null
            const manifesto = mapped['manifesto'] ?? mapped['motivo'] ?? null
            const severidade = mapped['severidade'] ?? null
            const campaign = mapped['campanha'] ?? null
            const product = mapped['produto'] ?? null
            const dt = mapped['data'] ?? null

            return {
              campaign: clean(campaign),
              client: null,
              group: clean(group),
              product: clean(product),
              adesao: clean(adesao),
              operador: clean(operador),
              status: clean(status),
              manifesto: clean(manifesto),
              severidade: clean(severidade),
              data: toISODate(dt)
            }
          })

          // Keep only lines that look like real records (operador or adesao or manifesto or status)
          const filtered = rows.filter(r =>
            (r.operador || r.adesao || r.manifesto) && r.status
          )
          return filtered
        }

        const headerRows = tryHeader()
        const headerLooksOk = headerRows.some(r => r.operador) && headerRows.length > 100

        if (headerLooksOk) {
          resolve(headerRows)
          return
        }

        // Fallback: read as 2D array (header:1) and pick columns by position:
        // D=4, F=6, G=7, J=10, K=11, V=22 (1-based); array is 0-based.
        const arr = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null }) as any[][]
        if (!arr.length) throw new Error('Planilha vazia')

        // Find header row by scanning first 50 lines for "Status" / "Operador"
        let headerRowIdx = 0
        for (let i = 0; i < Math.min(50, arr.length); i++) {
          const row = arr[i] || []
          const joined = row.map(v => (v ?? '')).join(' ').toString().toLowerCase()
          if (joined.includes('status') && (joined.includes('operador') || joined.includes('analista'))) {
            headerRowIdx = i
            break
          }
        }

        const dataRows = arr.slice(headerRowIdx + 1)

        const rows: NormalizedRow[] = dataRows.map((r) => {
          const status = clean(r[3])              // D
          const dt = r[5]                          // F
          const operador = clean(r[6])            // G
          const adesao = clean(r[9])              // J
          const manifesto = clean(r[10])          // K
          const severidade = clean(r[21])         // V
          return {
            campaign: null,
            client: null,
            group: clean(r[2]) ?? null,           // C if exists
            product: clean(r[4]) ?? null,         // E if exists
            adesao,
            operador,
            status,
            manifesto,
            severidade,
            data: toISODate(dt)
          }
        }).filter(r => (r.operador || r.adesao || r.manifesto) && r.status)

        resolve(rows)
      } catch (e:any) {
        reject(e)
      }
    }
    reader.readAsArrayBuffer(file)
  })
}
