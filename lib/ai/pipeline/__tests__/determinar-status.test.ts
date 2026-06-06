import { test } from 'node:test';
import assert from 'node:assert/strict';
import { determinarStatusFinal } from '@/lib/ai/pipeline/determinar-status';
import type { DocumentoInfo, DocumentosMap, StatusDocumento, ValidacaoIA } from '@/types/documentos';

function doc(status: StatusDocumento): DocumentoInfo {
  return {
    url: 'documentos/teste.jpg',
    status,
    tentativas: 1,
    resultado: { aprovado: status === 'aprovado' || status === 'analise_manual', motivo: null, dadosExtraidos: {} },
    atualizadoEm: '2026-06-04T00:00:00.000Z',
  };
}

function docs(statusComprovante: StatusDocumento): DocumentosMap {
  return {
    cnh: doc('aprovado'),
    comprovante: doc(statusComprovante),
    selfie: doc('aprovado'),
    videoApp: doc('aprovado'),
    videoVeiculo: doc('aprovado'),
  };
}

function validacaoIA(comprovanteNomeDivergente: boolean | null): ValidacaoIA {
  return {
    nomeCadastroConfere: true,
    nomeConfere: true,
    placaConfere: true,
    cpfConfere: true,
    enderecoConfere: null,
    biometriaConfere: true,
    biometriaScore: 95,
    comprovanteNomeDivergente,
  };
}

test('comprovante em nome de terceiro leva envio aprovado a ANALISE_MANUAL', () => {
  const resultado = determinarStatusFinal(docs('analise_manual'), validacaoIA(true));

  assert.deepEqual(resultado, {
    status: 'ANALISE_MANUAL',
    motivoManual: 'Comprovante em nome de terceiro',
  });
});

test('fluxo principal aprovado permanece APROVADO', () => {
  const resultado = determinarStatusFinal(docs('aprovado'), validacaoIA(false));

  assert.deepEqual(resultado, { status: 'APROVADO' });
});

test('documento com erro cai em PENDENCIA', () => {
  const resultado = determinarStatusFinal(docs('erro'), validacaoIA(false));

  assert.deepEqual(resultado, { status: 'PENDENCIA' });
});
