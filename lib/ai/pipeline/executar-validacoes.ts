import { isGeminiQuotaError } from '@/lib/ai/gemini';
import { TIMEOUT_VALIDACAO_MS } from './config';

export interface ResultadoTarefa {
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: unknown;
}

export interface TarefaValidacao {
  tipo: string;
  fn: () => Promise<ResultadoTarefa>;
}

/** Tarefa que falhou definitivamente (após retry). */
export interface ErroTarefa {
  erro: string;
}

export function isErroTarefa(v: ResultadoTarefa | ErroTarefa): v is ErroTarefa {
  return 'erro' in v;
}

type SaidaExecucao =
  | { status: 'fulfilled'; value: ResultadoTarefa }
  | { status: 'rejected'; reason: unknown };

interface OpcoesExecucao {
  timeoutMs?: number;
  retryDelayMs?: number;
}

class TimeoutValidacaoError extends Error {
  constructor(ms: number, tipo: string) {
    super(`Timeout de ${ms}ms na validação ${tipo}`);
    this.name = 'TimeoutValidacaoError';
  }
}

function comTimeout<T>(fn: () => Promise<T>, ms: number, tipo: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new TimeoutValidacaoError(ms, tipo));
    }, ms);

    fn().then(
      (valor) => {
        clearTimeout(id);
        resolve(valor);
      },
      (erro) => {
        clearTimeout(id);
        reject(erro);
      }
    );
  });
}

async function executarComRetry(
  fn: () => Promise<ResultadoTarefa>,
  tipo: string,
  { timeoutMs = TIMEOUT_VALIDACAO_MS, retryDelayMs = 3000 }: Required<OpcoesExecucao>
): Promise<SaidaExecucao> {
  const deadline = Date.now() + timeoutMs;
  const executarTentativa = () => {
    const restanteMs = Math.max(1, deadline - Date.now());
    return comTimeout(fn, restanteMs, tipo);
  };

  try {
    return { status: 'fulfilled' as const, value: await executarTentativa() };
  } catch (e) {
    if (e instanceof TimeoutValidacaoError || isGeminiQuotaError(e) || Date.now() >= deadline) {
      return { status: 'rejected' as const, reason: e };
    }

    const esperaRetryMs = Math.min(retryDelayMs, Math.max(1, deadline - Date.now()));
    console.warn(`[validacao] ${tipo}: 1ª tentativa falhou (${e instanceof Error ? e.message : String(e)}), tentando novamente em ${esperaRetryMs}ms...`);
    await new Promise((r) => setTimeout(r, esperaRetryMs));

    try {
      return { status: 'fulfilled' as const, value: await executarTentativa() };
    } catch (e2) {
      return { status: 'rejected' as const, reason: e2 };
    }
  }
}

/**
 * Executa todas as tarefas de validação EM PARALELO (`Promise.allSettled`), com
 * retry de rate limit por tarefa. Não persiste nada: apenas devolve os resultados
 * crus. A falha de uma tarefa não derruba as demais.
 */
export async function executarValidacoes(
  tarefas: TarefaValidacao[],
  opcoes: OpcoesExecucao = {}
): Promise<Map<string, ResultadoTarefa | ErroTarefa>> {
  const opcoesCompletas: Required<OpcoesExecucao> = {
    timeoutMs: opcoes.timeoutMs ?? TIMEOUT_VALIDACAO_MS,
    retryDelayMs: opcoes.retryDelayMs ?? 3000,
  };

  const execucoes = await Promise.allSettled(
    tarefas.map(async ({ tipo, fn }) => {
      console.log(`[validacao] Iniciando: ${tipo}`);
      const inicio = Date.now();
      const saida = await executarComRetry(fn, tipo, opcoesCompletas);
      return { tipo, saida, duracaoMs: Date.now() - inicio };
    })
  );

  const resultados = new Map<string, ResultadoTarefa | ErroTarefa>();

  execucoes.forEach((execucao, i) => {
    if (execucao.status === 'rejected') {
      const tipo = tarefas[i].tipo;
      const msg = execucao.reason instanceof Error ? execucao.reason.message : String(execucao.reason);
      console.error(`[validacao] ${tipo}: ERRO inesperado | ${msg}`);
      resultados.set(tipo, { erro: msg });
      return;
    }

    const { tipo, saida, duracaoMs } = execucao.value;
    if (saida.status === 'fulfilled') {
      console.log(
        `[validacao] ${tipo}: ${saida.value.aprovado ? 'APROVADO' : 'REJEITADO'} (${duracaoMs}ms)` +
        (saida.value.motivo ? ` | motivo: ${saida.value.motivo}` : '')
      );
      resultados.set(tipo, saida.value);
    } else {
      const err = saida.reason;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[validacao] ${tipo}: ERRO (${duracaoMs}ms) | ${msg}`);
      if (err instanceof Error && err.stack) console.error(`[validacao] ${tipo} stack:`, err.stack);
      resultados.set(tipo, { erro: msg });
    }
  });

  return resultados;
}
