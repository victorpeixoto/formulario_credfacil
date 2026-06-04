# Análise trava +30 min no iPhone — Tasks

**Data:** 2026-06-04
**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)
**ClickUp:** [86ahf46z7](https://app.clickup.com/t/86ahf46z7)

> Implementado localmente em 2026-06-04. Pendências restantes dependem de ambiente real/merge.

---

## Camada 1 — Timeout por tarefa (raiz)
- [x] **T1** Adicionar `TIMEOUT_VALIDACAO_MS = 120_000` em `lib/ai/pipeline/config.ts`.
- [x] **T2** Em `lib/ai/pipeline/executar-validacoes.ts`, criar helper `comTimeout(fn, ms, tipo)` (Promise.race) e aplicá-lo em `executarComRetry`. Tornar `ms` parametrizável (default = `TIMEOUT_VALIDACAO_MS`) para teste.
- [x] **T3** Garantir que timeout → rejeição → `ErroTarefa` (caminho já existente), sem alterar a montagem de resultados.

## Camada 2 — Status terminal em falha
- [x] **T4** No `.catch()` de `executarPipeline(...)` em `app/api/validacao/iniciar/route.ts`, gravar `statusDocumentos: 'PENDENCIA'` para o `formCode` (com try/catch interno e log).

## Camada 3 — Frontend (feedback + reconexão limitada)
- [x] **T5** Em `app/(auth)/status/page.tsx`, adicionar `es.addEventListener('erro', ...)` exibindo mensagem clara e fechando o stream.
- [x] **T6** Limitar `es.onerror`: contador de reconexões (ref) com teto de 5; ao exceder, parar e exibir aviso de demora.
- [x] **T7** Novo estado `erroAnalise` + UI de aviso com botão "Recarregar".

## Teste
- [x] **T8** `lib/ai/pipeline/__tests__/executar-validacoes.test.ts` (`node --test`): tarefa que nunca resolve → `ErroTarefa` dentro do timeout; tarefa normal sem regressão.

## Validação final
- [x] **T9** `npm test` verde (novo teste + suíte de cruzamento existente).
- [x] **T10** `npx eslint` nos arquivos tocados + `npx tsc --noEmit` limpos.
- [ ] **T11** Teste manual no iPhone: enviar vídeo grande → ou conclui, ou cai em `PENDENCIA` com mensagem (nunca trava infinito).
- [ ] **T12** Atualizar a task `86ahf46z7` no ClickUp após merge.

## Ordem sugerida
T1 → T2 → T3 → T8 (raiz + teste) → T4 (orquestrador) → T5–T7 (frontend) → T9–T12.

## Dependências
- T11 (teste manual no iPhone) precisa de ambiente dev/staging com credenciais Gemini/Rekognition/Mongo/R2.

## Decisões em aberto (ver spec/design)
- Status terminal em falha: `PENDENCIA` vs. status de erro dedicado.
- Política de reconexão do frontend (nº de tentativas vs. tempo total).
- (Futuro) Fila/worker para eliminar o fire-and-forget em serverless.
