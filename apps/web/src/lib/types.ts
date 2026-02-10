export type NormalizedRow = {
  campaign?: string | null
  client?: string | null
  group?: string | null          // esteira/grupo (ex: CNC)
  product?: string | null
  adesao?: string | null         // ADE
  operador?: string | null        // analista
  status?: string | null         // CONFERE / NÃO CONFERE
  manifesto?: string | null       // motivo
  severidade?: string | null      // LEVE/GRAVE/GRAVISSIMO/MEDIO
  data?: string | null           // ISO string
}

export type DashboardFilters = {
  dateFrom?: string
  dateTo?: string
  adesao?: string
  operador?: string
  group?: string
  severidade?: string
  minPoints?: string
  maxPoints?: string
}

export type AnalystRow = {
  operador: string
  total: number
  avgQuality: number
  errors: number
  prodRank: number
  hoStatus: 'HO' | 'ALERTA' | 'PRESENCIAL'
}
