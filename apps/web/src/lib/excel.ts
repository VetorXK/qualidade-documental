import * as XLSX from 'xlsx'
import type { NormalizedRow } from './types'

function normKey(k: string) {
  return k.trim().toLowerCase()
    .replace(/\s+/g,' ')
    .replace(/[\u0300-\u036f]/g, '') // remove accents (after NFD)
}

function toISODate(v: any): string | null {
  if (!v) return null
  // Excel can provide Date object already
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString()
  // If it is a number, it can be Excel date
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) {
      const dt = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, d.S))
      return dt.toISOString()
    }
  }
  // Try parse string
  const s = String(v).trim()
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString()
  return null
}

export function parseRelatorio(file: File): Promise<NormalizedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'))
    reader.onload = () => {
      const data = new Uint8Array(reader.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets['Relatorio'] || wb.Sheets['Relatório'] || wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null })

      // Map columns by normalized header
      const rows: NormalizedRow[] = json.map((r) => {
        const mapped: Record<string, any> = {}
        for (const [k, v] of Object.entries(r)) mapped[normKey(k.normalize('NFD'))] = v

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
          campaign,
          client: null, // opcional (pode derivar de campanha depois)
          group: group ? String(group).trim() : null,
          product: product ? String(product).trim() : null,
          adesao: adesao ? String(adesao).trim() : null,
          operador: operador ? String(operador).trim() : null,
          status: status ? String(status).trim() : null,
          manifesto: manifesto ? String(manifesto).trim() : null,
          severidade: severidade ? String(severidade).trim() : null,
          data: toISODate(dt)
        } satisfies NormalizedRow
      })

      resolve(rows)
    }
    reader.readAsArrayBuffer(file)
  })
}
