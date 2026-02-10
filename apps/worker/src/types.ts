export type NormalizedRow = {
  campaign?: string | null
  client?: string | null
  group?: string | null
  product?: string | null
  adesao?: string | null
  operador?: string | null
  status?: string | null
  manifesto?: string | null
  severidade?: string | null
  data?: string | null
}

export type Filters = {
  dateFrom?: string
  dateTo?: string
  adesao?: string
  operador?: string
  group?: string
  severidade?: string
  minPoints?: string
  maxPoints?: string
}
