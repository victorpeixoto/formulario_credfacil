import type { DocumentosMap, TipoDocumento, ValidacaoIA } from '@/types/documentos';
import { MAX_TENTATIVAS_ANTES_MANUAL } from './config';

export type StatusDocumentos = 'APROVADO' | 'PENDENCIA' | 'ANALISE_MANUAL';

const TIPOS_PRINCIPAIS: TipoDocumento[] = ['cnh', 'comprovante', 'selfie', 'videoApp', 'videoVeiculo'];

export function determinarStatusFinal(
  docs: DocumentosMap,
  validacaoIA: ValidacaoIA
): { status: StatusDocumentos; motivoManual?: string } {
  const algumRejeitado = TIPOS_PRINCIPAIS.some((t) => docs[t]?.status === 'rejeitado');
  const todosAprovados = TIPOS_PRINCIPAIS.every(
    (t) => docs[t]?.status === 'aprovado' || docs[t]?.status === 'analise_manual'
  );
  const algumAnaliseManual = TIPOS_PRINCIPAIS.some((t) => docs[t]?.status === 'analise_manual');

  const divergenciaIdentidade =
    validacaoIA.nomeCadastroConfere === false ||
    validacaoIA.nomeConfere === false ||
    validacaoIA.cpfConfere === false;

  if (todosAprovados && !algumRejeitado && !divergenciaIdentidade && (validacaoIA.comprovanteNomeDivergente === true || algumAnaliseManual)) {
    return { status: 'ANALISE_MANUAL', motivoManual: 'Comprovante em nome de terceiro' };
  }

  if (todosAprovados && !algumRejeitado && !divergenciaIdentidade) {
    return { status: 'APROVADO' };
  }

  if (algumRejeitado || divergenciaIdentidade) {
    const docComMuitasTentativas = TIPOS_PRINCIPAIS.find(
      (t) => docs[t]?.status === 'rejeitado' && (docs[t]?.tentativas ?? 0) >= MAX_TENTATIVAS_ANTES_MANUAL
    );
    if (docComMuitasTentativas) {
      const docsProblem = TIPOS_PRINCIPAIS
        .filter((t) => docs[t]?.status === 'rejeitado' && (docs[t]?.tentativas ?? 0) >= MAX_TENTATIVAS_ANTES_MANUAL)
        .join(', ');
      return { status: 'ANALISE_MANUAL', motivoManual: `Documentos com 3+ rejeições: ${docsProblem}` };
    }
    return { status: 'PENDENCIA' };
  }

  return { status: 'PENDENCIA' };
}
