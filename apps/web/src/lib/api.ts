import type { DashboardFilters, NormalizedRow } from './types'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787'

export async function importRows(payload: { importLabel: string, rows: NormalizedRow[] }) {
  const res = await fetch(`${API_BASE}/api/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getDashboard(filters: DashboardFilters) {
  const qs = new URLSearchParams(Object.entries(filters).filter(([,v]) => v && String(v).length>0) as any)
  const res = await fetch(`${API_BASE}/api/dashboard?` + qs.toString())
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
