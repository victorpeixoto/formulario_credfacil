// Oráculo AS-IS: reproduz o comportamento ATUAL de cruzamento compondo as
// funções de produção existentes exatamente como `app/api/validacao/iniciar/route.ts`
// as orquestra hoje:
//   1. regra própria do doc (aprovadoRegraPropria) + cruzamento inline por doc;
//   2. comprovante aprovado com nome de terceiro → analise_manual;
//   3. validacaoIA global via cruzarDados;
//   4. placa divergente entre fontes → rejeita selfie/videoApp.
//
// Serve de baseline para a refatoração: `avaliarCruzamento` (módulo unificado)
// deve produzir a MESMA saída que este oráculo para os vetores de regressão.
import { aplicarCruzamentoInline } from '@/lib/ai/pipeline/cruzamento-inline';
import { cruzarDados, calcularSimilaridade, type DadosCadastro } from '@/lib/ai/cruzamento';
import { THRESHOLD_NOME } from '@/lib/ai/pipeline/config';
import type { ResultadoTarefa } from '@/lib/ai/pipeline/executar-validacoes';
import type { DadosExtraidosMap, ResultadoCruzamento } from '@/lib/ai/pipeline/tipos-cruzamento';
import type { StatusDocumento, TipoDocumento } from '@/types/documentos';

const DOCS: TipoDocumento[] = ['cnh', 'comprovante', 'selfie', 'videoApp', 'videoVeiculo'];
const MOTIVO_PLACA = 'Placa divergente entre selfie e vídeo do app';

export function avaliarCruzamentoAtual(
  extraidos: DadosExtraidosMap,
  cadastro: DadosCadastro
): ResultadoCruzamento {
  const statusPorDoc: ResultadoCruzamento['statusPorDoc'] = {};
  const motivos: ResultadoCruzamento['motivos'] = {};

  for (const tipo of DOCS) {
    const entrada = extraidos[tipo];
    if (!entrada) continue;

    const nomeDivergente =
      tipo === 'comprovante'
        ? entrada.dadosExtraidos.nome
          ? calcularSimilaridade(String(entrada.dadosExtraidos.nome), cadastro.nomeCompleto) < THRESHOLD_NOME
          : false
        : undefined;

    const resultado: ResultadoTarefa = {
      aprovado: entrada.aprovadoRegraPropria,
      motivo: entrada.motivo,
      dadosExtraidos: entrada.dadosExtraidos,
    };

    const cruz = aplicarCruzamentoInline(tipo, resultado, cadastro);

    const status: StatusDocumento =
      cruz.aprovado && tipo === 'comprovante' && nomeDivergente === true
        ? 'analise_manual'
        : cruz.aprovado
          ? 'aprovado'
          : 'rejeitado';

    statusPorDoc[tipo] = status;
    motivos[tipo] = cruz.motivo;
  }

  const resultadosParaCruzamento: Parameters<typeof cruzarDados>[0] = {};
  for (const tipo of [...DOCS, 'biometria'] as const) {
    const entrada = extraidos[tipo];
    if (entrada) {
      (resultadosParaCruzamento as Record<string, { dadosExtraidos: unknown }>)[tipo] = {
        dadosExtraidos: entrada.dadosExtraidos,
      };
    }
  }
  const validacaoIA = cruzarDados(resultadosParaCruzamento, cadastro);

  if (validacaoIA.placaConfere === false) {
    for (const tipo of ['selfie', 'videoApp'] as const) {
      if (extraidos[tipo]) {
        statusPorDoc[tipo] = 'rejeitado';
        motivos[tipo] = MOTIVO_PLACA;
      }
    }
  }

  return { statusPorDoc, motivos, validacaoIA };
}
