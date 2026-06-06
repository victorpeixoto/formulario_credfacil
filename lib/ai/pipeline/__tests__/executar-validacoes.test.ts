import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeminiQuotaError } from '@/lib/ai/gemini';
import { executarValidacoes, isErroTarefa, type TarefaValidacao } from '@/lib/ai/pipeline/executar-validacoes';

test('executa em paralelo (sem delay sequencial entre tarefas)', async () => {
  const inicios: number[] = [];
  const tarefa = (tipo: string): TarefaValidacao => ({
    tipo,
    fn: async () => {
      inicios.push(Date.now());
      await new Promise((r) => setTimeout(r, 50));
      return { aprovado: true, motivo: null, dadosExtraidos: { tipo } };
    },
  });

  const t0 = Date.now();
  const res = await executarValidacoes([tarefa('a'), tarefa('b'), tarefa('c')]);
  const total = Date.now() - t0;

  assert.equal(res.size, 3);
  // Concorrente: ~50ms no total, não ~150ms. Todas começam quase juntas.
  assert.ok(total < 130, `esperado < 130ms (concorrente), obtido ${total}ms`);
  assert.ok(Math.max(...inicios) - Math.min(...inicios) < 30, 'tarefas devem iniciar quase simultaneamente');
});

test('falha de uma tarefa não derruba as demais (allSettled + retry)', async () => {
  const tarefas: TarefaValidacao[] = [
    { tipo: 'ok', fn: async () => ({ aprovado: true, motivo: null, dadosExtraidos: {} }) },
    { tipo: 'falha', fn: async () => { throw new Error('boom'); } },
  ];

  const res = await executarValidacoes(tarefas, { retryDelayMs: 1 });

  const ok = res.get('ok');
  const falha = res.get('falha');
  assert.ok(ok && !isErroTarefa(ok) && ok.aprovado === true);
  assert.ok(falha && isErroTarefa(falha) && falha.erro === 'boom');
});

test('erro de cota do Gemini nao dispara retry extra no executor', async () => {
  let chamadas = 0;
  const tarefas: TarefaValidacao[] = [
    {
      tipo: 'selfie',
      fn: async () => {
        chamadas += 1;
        throw new GeminiQuotaError('429 Too Many Requests: credits are depleted');
      },
    },
  ];

  const res = await executarValidacoes(tarefas, { retryDelayMs: 1 });
  const selfie = res.get('selfie');

  assert.equal(chamadas, 1);
  assert.ok(selfie && isErroTarefa(selfie));
  assert.match(selfie.erro, /429/);
});

test('tarefa travada vira erro dentro do timeout configurado', async () => {
  const tarefas: TarefaValidacao[] = [
    { tipo: 'travada', fn: () => new Promise(() => {}) },
    { tipo: 'ok', fn: async () => ({ aprovado: true, motivo: null, dadosExtraidos: {} }) },
  ];

  const inicio = Date.now();
  const res = await executarValidacoes(tarefas, { timeoutMs: 40, retryDelayMs: 1 });
  const duracaoMs = Date.now() - inicio;

  const travada = res.get('travada');
  const ok = res.get('ok');

  assert.ok(duracaoMs < 150, `esperado timeout rápido, obtido ${duracaoMs}ms`);
  assert.ok(travada && isErroTarefa(travada));
  assert.match(travada.erro, /Timeout/);
  assert.ok(ok && !isErroTarefa(ok) && ok.aprovado === true);
});
