function norm(s: string) {
  return s.trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function pointsFor(statusRaw: string | null | undefined, severidadeRaw: string | null | undefined): number {
  const status = statusRaw ? norm(statusRaw) : ''
  if (status.includes('CONFERE') && !status.includes('NAO')) return 100
  // NÃO CONFERE
  const sev = severidadeRaw ? norm(severidadeRaw) : ''
  if (sev.includes('GRAVISSIMO')) return 80
  if (sev.includes('GRAVE')) return 90
  if (sev.includes('MEDIO')) return 95
  if (sev.includes('LEVE')) return 98
  // Se tiver "NÃO CONFERE" mas não veio severidade, assume GRAVE (ajustável)
  return 90
}

export function isError(statusRaw: string | null | undefined): boolean {
  const status = statusRaw ? norm(statusRaw) : ''
  return status.includes('NAO') && status.includes('CONFERE')
}
