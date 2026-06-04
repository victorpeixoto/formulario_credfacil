# Remover validação de placa no vídeo do veículo — Design

**Data:** 2026-06-04
**Spec:** [spec.md](./spec.md)
**ClickUp:** [86ahw4mc7](https://app.clickup.com/t/86ahw4mc7)

---

## Regra correta (esclarecida pelo cliente)

O cruzamento de placa deve ocorrer **somente entre a selfie e o vídeo do app** (`selfie × videoApp`). O **vídeo do veículo deixa de ser fonte de placa** e não deve ser rejeitado por divergência de placa.

## Estado atual (3 fontes)

`lib/ai/pipeline/avaliar-cruzamento.ts` cruza a placa entre **3 fontes** e rejeita as 3 em caso de divergência:

```ts
// linha 17
const MOTIVO_PLACA = 'Placa divergente entre selfie, vídeo do app e vídeo do veículo';

// linhas 143-151 — fontes da placa
const placas = [selfie?.placa, videoApp?.placa, videoVeiculo?.placa]
  .filter(Boolean)
  .map((p) => String(p).replace(/\s/g, '').toUpperCase());
if (placas.length >= 2) { /* placaConfere = maioria coincide */ }

// linhas 167-175 — divergência rejeita as 3 fontes
if (placaConfere === false) {
  for (const tipo of ['selfie', 'videoApp', 'videoVeiculo'] as const) {
    if (extraidos[tipo]) { statusPorDoc[tipo] = 'rejeitado'; motivos[tipo] = MOTIVO_PLACA; }
  }
}
```

Além disso, `lib/ai/validacoes/video-veiculo.ts` ainda **extrai** a placa (`placaVisivel`/`placa`) no PROMPT, embora não reprove sozinho por ela.

## Arquivos

| Papel | Arquivo |
|---|---|
| Cruzamento de placa (fontes + rejeição) | [lib/ai/pipeline/avaliar-cruzamento.ts](../../../lib/ai/pipeline/avaliar-cruzamento.ts) |
| Validação isolada do vídeo (extrai placa) | [lib/ai/validacoes/video-veiculo.ts](../../../lib/ai/validacoes/video-veiculo.ts) |
| Tipos | `types/documentos` (`ResultadoVideoVeiculo`) |
| Fixtures/baseline | [lib/ai/pipeline/__tests__/](../../../lib/ai/pipeline/__tests__/) |

## Decisão técnica

### 1. `avaliar-cruzamento.ts` — cruzar só selfie × vídeo do app
- **Fontes da placa (linha 144):** remover `videoVeiculo?.placa` → `const placas = [selfie?.placa, videoApp?.placa]`.
- **Rejeição por divergência (linha 169):** remover `videoVeiculo` do loop → `for (const tipo of ['selfie', 'videoApp'] as const)`.
- **Motivo (linha 17):** atualizar `MOTIVO_PLACA` → `'Placa divergente entre selfie e vídeo do app'`.
- Observação: com 2 fontes, `placas.length >= 2` exige selfie **e** vídeo do app presentes; faltando uma, `placaConfere = null` (não rejeita). Comportamento aceitável.

### 2. `video-veiculo.ts` — parar de extrair placa
- Remover do PROMPT o item da placa e os campos `placaVisivel`/`placa` do JSON (não são mais usados em lugar nenhum).
- Atualizar `ResultadoVideoVeiculo` removendo `placaVisivel`/`placa`.
- Manter as regras próprias do vídeo do veículo: `veiculoLigado` e `temCortes`.

### 3. Testes
- Rodar `npm test`; ajustar `fixtures-cruzamento.ts` / oráculo para refletir placa só entre selfie e vídeo do app (remover expectativas que rejeitavam o vídeo do veículo por placa).

## Verificação

`grep -rn "placa" lib/ai/pipeline lib/ai/validacoes/video-veiculo.ts` — confirmar que o vídeo do veículo não é mais fonte nem alvo de rejeição por placa.

## Testes manuais

- Vídeo do veículo ligado, sem cortes, placa ilegível/ausente → aprova.
- Placa da selfie divergente da placa do vídeo do app → rejeita selfie e vídeo do app (não o vídeo do veículo).
