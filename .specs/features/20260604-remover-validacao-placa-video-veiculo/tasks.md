# Remover validação de placa no vídeo do veículo — Tasks

**Data:** 2026-06-04
**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)
**ClickUp:** [86ahw4mc7](https://app.clickup.com/t/86ahw4mc7)

---

- [x] **T1** Em `lib/ai/pipeline/avaliar-cruzamento.ts` (linha ~144), remover `videoVeiculo?.placa` das fontes: `const placas = [selfie?.placa, videoApp?.placa]`.
- [x] **T2** No loop de rejeição por divergência (linha ~169), remover `videoVeiculo`: `for (const tipo of ['selfie', 'videoApp'] as const)`.
- [x] **T3** Atualizar `MOTIVO_PLACA` (linha ~17) → `'Placa divergente entre selfie e vídeo do app'`.
- [x] **T4** Em `lib/ai/validacoes/video-veiculo.ts`, remover do PROMPT a placa e os campos `placaVisivel`/`placa` do JSON.
- [x] **T5** Atualizar `ResultadoVideoVeiculo` em `types/documentos` removendo `placaVisivel`/`placa`.
- [x] **T6** Rodar `npm test` e ajustar `fixtures-cruzamento.ts`/oráculo para placa só entre selfie e vídeo do app (remover expectativas que rejeitavam o vídeo do veículo por placa). → 26 testes verdes.
- [x] **T7** `grep -rn "placa" lib/ai/pipeline lib/ai/validacoes/video-veiculo.ts` — confirmar que o vídeo do veículo não é mais fonte nem alvo. → só restam `selfie?.placa`/`videoApp?.placa`.
- [x] **T8** Teste manual: vídeo do veículo ligado, sem cortes, placa ausente → aprova; selfie × vídeo do app divergentes → rejeita só esses dois. → coberto pela fixture `placa-divergente-entre-fontes` (videoVeiculo `aprovado`).

> **Achado de implementação:** a regra de placa estava duplicada em `lib/ai/cruzamento.ts` (`cruzarDados`, legado/oráculo) além de `avaliar-cruzamento.ts`. Ambos foram alinhados para selfie × vídeo do app, senão o teste de regressão `[novo] === baseline` quebraria.

## Validação final
- [x] `npm test` verde (26/26) · `npm run lint` limpo nos arquivos tocados.
- [ ] Atualizar a task `86ahw4mc7` no ClickUp após merge.

**Dependências:** nenhuma.
