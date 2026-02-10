import type { Filters } from './types'

export function buildWhere(filters: Filters) {
  const where: string[] = []
  const args: any[] = []

  if (filters.dateFrom) { where.push('date(data) >= date(?)'); args.push(filters.dateFrom) }
  if (filters.dateTo) { where.push('date(data) <= date(?)'); args.push(filters.dateTo) }
  if (filters.adesao) { where.push('adesao = ?'); args.push(filters.adesao) }
  if (filters.operador) { where.push('operador LIKE ?'); args.push(`%${filters.operador}%`) }
  if (filters.group) { where.push('grupo LIKE ?'); args.push(`%${filters.group}%`) }
  if (filters.severidade) { where.push('upper(severidade) LIKE upper(?)'); args.push(`%${filters.severidade}%`) }
  if (filters.minPoints) { where.push('pontos >= ?'); args.push(Number(filters.minPoints)) }
  if (filters.maxPoints) { where.push('pontos <= ?'); args.push(Number(filters.maxPoints)) }

  return {
    clause: where.length ? ('WHERE ' + where.join(' AND ')) : '',
    args
  }
}
