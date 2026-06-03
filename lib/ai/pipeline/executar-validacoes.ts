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

/**
 * Executa todas as tarefas de validação EM PARALELO (`Promise.allSettled`), com
 * retry de rate limit por tarefa. Não persiste nada: apenas devolve os resultados
 * crus. A falha de uma tarefa não derruba as demais.
 */
export async function executarValidacoes(
  tarefas: TarefaValidacao[]
): Promise<Map<string, ResultadoTarefa | ErroTarefa>> {
  const execucoes = await Promise.allSettled(
    tarefas.map(async ({ tipo, fn }) => {
      console.log(`[validacao] Iniciando: ${tipo}`);
      const inicio = Date.now();
      const saida = await executarComRetry(fn, tipo);
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
