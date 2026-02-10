export type HoStatus = 'HO' | 'ALERTA' | 'PRESENCIAL'

export function hoStatus(avgQuality: number, prodRank: number): HoStatus {
  // Regras padrão (ajustáveis):
  // - Mantém HO: >= 0.90 e rank <= 25
  // - Alerta: 0.88–0.899
  // - Presencial: abaixo disso ou rank ruim
  if (avgQuality >= 0.90 && prodRank <= 25) return 'HO'
  if (avgQuality >= 0.88 && avgQuality < 0.90) return 'ALERTA'
  return 'PRESENCIAL'
}
