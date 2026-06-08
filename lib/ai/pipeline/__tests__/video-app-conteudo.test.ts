import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarRegraVideoApp } from '@/lib/ai/validacoes/video-app';
import type { ResultadoVideoApp } from '@/types/documentos';

function dadosApp(over: Partial<ResultadoVideoApp> = {}): ResultadoVideoApp {
  return {
    appTransporte: true,
    nomePerfil: 'Fulano',
    placa: 'ABC1D23',
    faturamento180d: 'R$ 30.000',
    tempoUso: '2 anos',
    totalCorridas: '5000',
    temCortes: false,
    aplicativo: 'iFood',
    ganhosMensais: [
      { mes: '2026-01', valor: 4000 },
      { mes: '2026-02', valor: 4000 },
      { mes: '2026-03', valor: 4000 },
      { mes: '2026-04', valor: 4000 },
      { mes: '2026-05', valor: 4000 },
      { mes: '2026-06', valor: 4000 },
    ],
    formatoGanhos: 'mensal',
    fotoPerfilVisivel: true,
    ...over,
  };
}

test('vídeo que não é app de transporte reprova antes de qualquer outra regra', () => {
  // Cenário do bug: vídeo aleatório (carro) — modelo retorna ehappTransporte=false e campos nulos.
  const resultado = validarRegraVideoApp(
    dadosApp({
      appTransporte: false,
      nomePerfil: null,
      placa: null,
      faturamento180d: null,
      ganhosMensais: null,
      formatoGanhos: null,
    })
  );

  assert.equal(resultado.aprovado, false);
  assert.match(resultado.motivo ?? '', /gravação de tela de um aplicativo/i);
});

test('vídeo de app válido com ganhos acima do mínimo aprova', () => {
  const resultado = validarRegraVideoApp(dadosApp());

  assert.equal(resultado.aprovado, true);
  assert.equal(resultado.motivo, null);
});
