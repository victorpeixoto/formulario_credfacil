# Análise da IA trava +30 min no iPhone sem retorno — Especificação

**Data:** 2026-06-04
**Status:** Implementado localmente (pendente teste manual iPhone/staging e atualização ClickUp pós-merge)
**ClickUp:** [86ahf46z7](https://app.clickup.com/t/86ahf46z7) (prioridade *urgent*, to do)
**Branch sugerida:** `fix/analise-trava-sem-timeout`
**Feature de origem:** `validacao-documentos-ia` / `refatoracao-pipeline-validacao`

---

## Problema

Testado no iPhone: após enviar os documentos, a análise da IA fica "processando" por ~30 minutos e **nunca retorna** resultado nem erro. O cliente não sabe se deu certo, pode desistir ou reenviar tudo (gerando duplicidade e mais carga).

## Causa raiz (investigação 2026-06-04)

Cadeia de falha — a causa **primária** é a ausência de timeout nas tarefas de validação:

1. **Sem timeout por tarefa (raiz).** `lib/ai/pipeline/executar-validacoes.ts` usa `Promise.allSettled`, que só resolve quando **todas** as tarefas terminam. `executarComRetry` faz `await fn()` **sem timeout**. Em `lib/ai/gemini.ts` e `lib/ai/rekognition.ts`, nem os `fetch()` de download nem `model.generateContent()` têm `AbortSignal`/timeout. Se **uma** tarefa travar (ex.: vídeo `.mov` grande do iPhone sendo base64-inline pro Gemini, ou download R2 lento), `allSettled` **espera para sempre** → `executarPipeline` nunca grava o status final → `statusDocumentos` fica **`PROCESSANDO` eternamente**.

2. **Falha silenciosa no orquestrador (agravante).** `app/api/validacao/iniciar/route.ts` dispara o pipeline em *fire-and-forget* e o `.catch()` **só faz `console.error`** — nunca grava um status de falha. Qualquer exceção (ou função serverless congelada após o `return`) também deixa `PROCESSANDO` para sempre.

3. **Frontend reconecta infinitamente (agravante).** `app/(auth)/status/page.tsx` (`es.onerror`) fecha e **reconecta a cada 3s sem limite**, e **não há listener para o evento `erro`** que o servidor emite no timeout de 10 min (`app/api/validacao/status/route.ts`). A mensagem "Timeout — recarregue a página" **nunca chega ao usuário**; ele vê "analisando" indefinidamente (10 + 10 + 10 min = os ~30 min relatados).

**Por que iPhone:** iPhone grava vídeo HEVC `.mov` (arquivos grandes) e fotos HEIC. O vídeo grande inline ao Gemini é o candidato mais provável a estagnar sem erro. (HEIC no Rekognition já lança erro tratado em `rekognition.ts` — esse caminho não trava.)

## Goals

- [x] Garantir que o pipeline **sempre** chega a um status terminal (nunca fica preso em `PROCESSANDO`).
- [x] Uma tarefa de validação travada vira erro tratado (→ `PENDENCIA`) sem derrubar as demais.
- [x] O usuário recebe feedback claro quando a análise demora além do esperado.

## Out of Scope

- ❌ Não alterar a lógica de cruzamento (`avaliar-cruzamento.ts`), decisão (`determinar-status.ts`) nem thresholds de aprovação.
- ❌ Não implementar conversão/normalização de HEIC/HEVC (transcodificação) nesta entrega — apenas garantir que o travamento vira erro com feedback.
- ❌ Não migrar o disparo do pipeline para fila/worker dedicado (avaliar depois; ver Design).

---

## User Stories

### P1: Pipeline nunca fica preso em PROCESSANDO ⭐ MVP

**User Story**: Como candidato, quero receber um resultado (ou um aviso de erro) em tempo razoável, mesmo que algum arquivo (vídeo grande do iPhone) atrapalhe a análise.

**Why P1**: É o cerne do bug urgente — trava infinita sem retorno.

**Acceptance Criteria**:

1. WHEN uma tarefa de validação não responde dentro de `TIMEOUT_VALIDACAO_MS` THEN o sistema SHALL tratá-la como `ErroTarefa` e continuar as demais.
2. WHEN qualquer tarefa vira `ErroTarefa` THEN o documento correspondente SHALL ficar com status `erro` e o status final SHALL cair em `PENDENCIA` (comportamento já existente).
3. WHEN o `executarPipeline` lança uma exceção não tratada THEN o `.catch()` no `route.ts` SHALL gravar um `statusDocumentos` terminal (`PENDENCIA`) em vez de deixar `PROCESSANDO`.
4. WHEN todas as tarefas terminam (sucesso, erro ou timeout) THEN o pipeline SHALL gravar exatamente um status final no MongoDB.

**Independent Test**: Uma `TarefaValidacao` cujo `fn()` nunca resolve deve produzir `ErroTarefa` dentro do timeout (teste `node --test`), em vez de pendurar o `executarValidacoes`.

### P2: Feedback ao usuário quando demora

**User Story**: Como candidato, quando a análise demora mais que o esperado, quero ver uma mensagem clara em vez de uma tela que gira para sempre.

**Acceptance Criteria**:

1. WHEN o servidor emite o evento SSE `erro` (timeout de 10 min) THEN o frontend SHALL exibir a mensagem ("A análise demorou mais que o esperado. Recarregue a página ou tente novamente.").
2. WHEN o `EventSource` cai por erro de rede THEN o frontend SHALL reconectar no máximo um número limitado de vezes (ou por um tempo total limitado) e então exibir a mensagem de demora — sem reconectar indefinidamente.

---

## Edge Cases

- WHEN o timeout dispara mas a tarefa eventualmente responderia THEN o resultado tardio SHALL ser ignorado (a tarefa já foi marcada como erro) — sem race que sobrescreva o status final.
- WHEN o reenvio parcial usa documentos já armazenados THEN o timeout NÃO SHALL afetar documentos não reenviados.
- WHEN a função serverless é congelada após o `return` (fire-and-forget) THEN o status terminal pode não ser gravado — mitigado parcialmente por P2 (feedback) e registrado como risco no Design.

---

## Success Criteria

- [x] `statusDocumentos` nunca permanece `PROCESSANDO` após o término das tarefas.
- [x] Tarefa travada → `ErroTarefa` dentro de `TIMEOUT_VALIDACAO_MS` (**120s**, decidido 2026-06-04).
- [x] Exceção no pipeline grava status terminal (`PENDENCIA`).
- [x] Frontend mostra mensagem de demora e não reconecta infinitamente.
- [x] Teste `node --test` da trava verde; suíte de cruzamento existente permanece verde.
- [x] Caminho de aprovação inalterado (nenhuma mudança na decisão/cruzamento).

---

## Decisões

- **Timeout por tarefa = 120s** (decidido com o cliente em 2026-06-04). Folga para vídeos grandes/redes lentas; o pipeline paralelo visa <60s no caso normal.
- **Implementação 2026-06-04:** timeout por tarefa, status terminal no orquestrador e feedback SSE implementados.

## Decisões em aberto

- Status terminal em falha do pipeline: decidido `PENDENCIA`.
- Limite de reconexão do frontend: decidido nº fixo de tentativas (`5`).
- (Futuro) Mover o disparo do pipeline para fila/worker para eliminar o risco de fire-and-forget em serverless.
