import type { FaixaFaturamento, TempoAtuacao, UltimaEntrega } from '@/types/formulario';

export function candidatoAprovado(
  faturamento: FaixaFaturamento,
  tempo: TempoAtuacao,
  ultimaEntrega: UltimaEntrega
): boolean {
  if (faturamento === 'menos_2k' || faturamento === '2k_3500') return false;
  if (tempo === 'menos_3m') return false;
  if (ultimaEntrega === 'mais_30_dias') return false;
  return true;
}
