import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarRegraCNH } from '@/lib/ai/validacoes/cnh';
import type { ResultadoCNH } from '@/types/documentos';

const DATA_ANALISE = new Date('2026-06-04T12:00:00Z');

function cnhComValidade(validade = ''): ResultadoCNH {
  return {
    nome: 'JOAO DA SILVA',
    cpf: '123.456.789-00',
    validade,
    categoria: 'B',
    legivel: true,
  };
}

test('CNH com 40 dias de validade aprova', () => {
  const resultado = validarRegraCNH(cnhComValidade('2026-07-14'), DATA_ANALISE);

  assert.equal(resultado.aprovado, true);
  assert.equal(resultado.motivo, null);
});

test('CNH com 10 dias de validade reprova como próxima do vencimento', () => {
  const resultado = validarRegraCNH(cnhComValidade('2026-06-14'), DATA_ANALISE);

  assert.equal(resultado.aprovado, false);
  assert.match(resultado.motivo ?? '', /próxima do vencimento/);
  assert.match(resultado.motivo ?? '', /30 dias/);
});

test('CNH vencida reprova como vencida', () => {
  const resultado = validarRegraCNH(cnhComValidade('2026-06-03'), DATA_ANALISE);

  assert.equal(resultado.aprovado, false);
  assert.equal(resultado.motivo, 'CNH vencida');
});

test('CNH sem validade reprova como data não identificada', () => {
  const resultado = validarRegraCNH(cnhComValidade(), DATA_ANALISE);

  assert.equal(resultado.aprovado, false);
  assert.equal(resultado.motivo, 'Data de validade não identificada');
});
