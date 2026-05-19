import { DELAY_ENTRE_VALIDACOES_MS } from './config';

export interface ResultadoTarefa {
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: unknown;
  nomeDivergente?: boolean;
}

export interface TarefaValidacao {
  tipo: string;
  fn: () => Promise<ResultadoTarefa>;
}

export interface ResultadoExecucao {
  tipo: string;
  status: 'fulfilled';
  value: ResultadoTarefa;
  duracaoMs: number;
}

export interface ErroExecucao {
  tipo: string;
  status: 'rejected';
  reason: unknown;
  duracaoMs: number;
}

type SaidaExecucao =
  | { status: 'fulfilled'; value: ResultadoTarefa }
  | { status: 'rejected'; reason: unknown };

async function executarComRetry(fn: () => Promise<ResultadoTarefa>, tipo: string): Promise<SaidaExecucao> {
  try {
    return { status: 'fulfilled' as const, value: await fn() };
  } catch (e) {
    console.warn(`[validacao] ${tipo}: 1ª tentativa falhou (${e instanceof Error ? e.message : String(e)}), tentando novamente em 3s...`);
    await new Promise((r) => setTimeout(r, 3000));
    try {
      return { status: 'fulfilled' as const, value: await fn() };
    } catch (e2) {
      return { status: 'rejected' as const, reason: e2 };
    }
  }
}

export async function executarValidacoes(
  tarefas: TarefaValidacao[],
  onResultado: (tipo: string, resultado: ResultadoTarefa) => Promise<ResultadoTarefa>
): Promise<Map<string, ResultadoTarefa>> {
  const resultados = new Map<string, ResultadoTarefa>();

  for (let i = 0; i < tarefas.length; i++) {
    const { tipo, fn } = tarefas[i];
    if (i > 0) await new Promise((r) => setTimeout(r, DELAY_ENTRE_VALIDACOES_MS));

    console.log(`[validacao] Iniciando: ${tipo}`);
    const inicio = Date.now();
    const saida = await executarComRetry(fn, tipo);
    const duracaoMs = Date.now() - inicio;

    if (saida.status === 'fulfilled') {
      console.log(
        `[validacao] ${tipo}: ${saida.value.aprovado ? 'APROVADO' : 'REJEITADO'} (${duracaoMs}ms)` +
        (saida.value.motivo ? ` | motivo: ${saida.value.motivo}` : '')
      );
      console.log(`[validacao] ${tipo} dadosExtraidos:`, JSON.stringify(saida.value.dadosExtraidos, null, 2));

      const resultadoFinal = await onResultado(tipo, saida.value);
      resultados.set(tipo, resultadoFinal);
    } else {
      const err = saida.reason;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[validacao] ${tipo}: ERRO (${duracaoMs}ms) | ${msg}`);
      if (err instanceof Error && err.stack) {
        console.error(`[validacao] ${tipo} stack:`, err.stack);
      }
    }
  }

  return resultados;
}
