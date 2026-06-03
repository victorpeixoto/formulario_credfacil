import { test } from 'node:test';
import assert from 'node:assert/strict';
import { casos, type CasoFixture } from './fixtures-cruzamento';
import { avaliarCruzamentoAtual } from './cruzamento-atual';
import { avaliarCruzamento } from '@/lib/ai/pipeline/avaliar-cruzamento';
import type { ResultadoCruzamento } from '@/lib/ai/pipeline/tipos-cruzamento';

/** Verifica que `resultado` satisfaz a expectativa de regra de negócio (`intent`). */
function verificarIntent(resultado: ResultadoCruzamento, caso: CasoFixture) {
  for (const [doc, status] of Object.entries(caso.intent.statusPorDoc ?? {})) {
    assert.equal(
      resultado.statusPorDoc[doc as keyof ResultadoCruzamento['statusPorDoc']],
      status,
      `${caso.nome}: statusPorDoc.${doc}`
    );
  }
  for (const [campo, valor] of Object.entries(caso.intent.validacaoIA ?? {})) {
    assert.deepEqual(
      resultado.validacaoIA[campo as keyof typeof resultado.validacaoIA],
      valor,
      `${caso.nome}: validacaoIA.${campo}`
    );
  }
}

// ── T2: baseline AS-IS ────────────────────────────────────────────────────────
// O oráculo (composição das funções de produção atuais) precisa satisfazer as
// regras de negócio de cada vetor. Verde aqui = baseline confiável antes de refatorar.
for (const caso of casos) {
  test(`[atual] ${caso.nome}: ${caso.descricao}`, () => {
    const resultado = avaliarCruzamentoAtual(caso.extraidos, caso.cadastro);
    verificarIntent(resultado, caso);
  });
}

// ── T5: módulo unificado === baseline ─────────────────────────────────────────
// `avaliarCruzamento` (novo módulo puro) precisa produzir saída IDÊNTICA ao oráculo
// AS-IS, campo a campo, além de satisfazer as regras de negócio.
for (const caso of casos) {
  test(`[novo] ${caso.nome}: idêntico ao baseline`, () => {
    const novo = avaliarCruzamento(caso.extraidos, caso.cadastro);
    const baseline = avaliarCruzamentoAtual(caso.extraidos, caso.cadastro);
    assert.deepEqual(novo, baseline, `${caso.nome}: saída diverge do baseline AS-IS`);
    verificarIntent(novo, caso);
  });
}
