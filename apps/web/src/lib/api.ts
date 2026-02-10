import type { DashboardFilters, NormalizedRow } from './types'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787'

export async function importRows(payload: { importLabel: string, rows: NormalizedRow[] }) {
  // Send in chunks to avoid timeouts / payload limits
  const chunkSize = 300
  let inserted = 0
  for (let i = 0; i < payload.rows.length; i += chunkSize) {
    const chunk = payload.rows.slice(i, i + chunkSize)
    const res = await fetch(`${API_BASE}/api/import`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ importLabel: payload.importLabel, rows: chunk }),
    })
    if (!res.ok) throw new Error(await res.text())
    const j = await res.json()
    inserted += (j.inserted || 0)
  }
  return { ok: true, inserted }
}

export async function getDashboard(filters: DashboardFilters) {
  const qs = new URLSearchParams(Object.entries(filters).filter(([,v]) => v && String(v).length>0) as any)
  const res = await fetch(`${API_BASE}/api/dashboard?` + qs.toString())
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getRows(filters: DashboardFilters, limit = 200, offset = 0) {
  const qs = new URLSearchParams(Object.entries(filters).filter(([,v]) => v && String(v).length>0) as any)
  qs.set('limit', String(limit))
  qs.set('offset', String(offset))
  const res = await fetch(`${API_BASE}/api/rows?` + qs.toString())
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function saveSnapshot(name: string, filters: DashboardFilters) {
  const res = await fetch(`${API_BASE}/api/snapshots`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, filters }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listSnapshots() {
  const res = await fetch(`${API_BASE}/api/snapshots`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function loadSnapshot(id: string) {
  const res = await fetch(`${API_BASE}/api/snapshots/${id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
