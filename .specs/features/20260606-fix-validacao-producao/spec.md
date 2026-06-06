# Fix Validação em Produção — PDF (DOMMatrix) + Cota Gemini (429) Specification

**Data:** 2026-06-06
**Projeto:** formulario-credfacil
**Origem:** Logs de produção (Coolify/VPS) — endpoint `POST /api/validacao/iniciar`

## Problem Statement

Em produção todas as 6 validações de documentos falham por **dois problemas independentes** que ocorrem simultaneamente. Documentos em PDF (CNH Digital e biometria/comprovante em PDF) quebram com `ReferenceError: DOMMatrix is not defined` porque o pacote nativo `@napi-rs/canvas` — exigido pelo `pdfjs-dist` (via `pdf-to-img`) para renderizar PDF em imagem — **não é incluído no build standalone do Docker**. As demais validações (selfie, comprovante imagem, vídeos) falham com `429 Too Many Requests — prepayment credits depleted` porque os **créditos da API do Gemini se esgotaram**. O resultado é que nenhum candidato consegue concluir a verificação por IA.

## Goals

- [ ] **G1:** Renderização de PDF funciona no container de produção (zero ocorrências de `DOMMatrix is not defined` / `Cannot find module '@napi-rs/canvas'`).
- [ ] **G2:** Esgotamento de cota / erro de billing do Gemini (429) é tratado de forma explícita e observável, sem prender o pipeline nem mascarar a causa.
- [ ] **G3:** O candidato recebe um status terminal claro (`PENDENCIA` / análise manual) quando a IA está indisponível por billing, em vez de erro genérico ou trava.
- [ ] **G4:** Time recebe alerta operacional acionável quando a causa for billing/cota (para recarregar créditos rapidamente).

> **Decisões confirmadas (2026-06-06):**
> - **429:** manter a estratégia de retry atual; após **3 tentativas** esgotadas, **desabilitar o retry** e marcar o documento como `PENDENCIA` (+ alerta). Não tentar distinguir billing de rate-limit pela mensagem.
> - **Runbook (P3):** incluído no `design.md` desta feature (atualização de 2026-06-06). Escopo ativo = **P1 + P2 + P3**.

## Out of Scope

- Trocar de provider de IA (ex.: migrar Gemini → outro modelo). Apenas tratar a falha de cota do provider atual.
- Trocar a biblioteca de conversão de PDF (`pdf-to-img`/`pdfjs-dist`) por outra.
- Refatorar a lógica de cruzamento/decisão das validações (coberto por `refatoracao-pipeline-validacao`).
- Implementar fila/retry assíncrono de longo prazo (reprocessar automaticamente quando créditos voltarem).
- Gestão de billing na conta Google (ação humana no AI Studio) — fora do código, apenas documentada no runbook.

---

## User Stories

### P1: PDF renderiza em produção (corrigir `@napi-rs/canvas` ausente) ⭐ MVP

**User Story**: Como candidato que envia a CNH Digital em PDF, quero que o sistema processe meu documento, para que minha verificação não falhe por erro de infraestrutura.

**Why P1**: Sem isso, **toda** validação de CNH e de qualquer documento em PDF (biometria/comprovante) falha 100% das vezes em produção. É o bloqueio mais crítico e está 100% no nosso controle.

**Acceptance Criteria**:

1. WHEN o build standalone do Docker é gerado THEN o sistema SHALL incluir o pacote `@napi-rs/canvas` (e seu binário nativo da plataforma `linux`) no `.next/standalone/node_modules`.
2. WHEN um candidato envia um documento `application/pdf` (CNH/biometria) em produção THEN o sistema SHALL converter o PDF em imagem via `pdf-to-img` sem lançar `DOMMatrix is not defined` nem `Cannot find module '@napi-rs/canvas'`.
3. WHEN o container de produção inicia THEN o log de boot SHALL NÃO conter os warnings `Cannot polyfill DOMMatrix/ImageData/Path2D`.
4. WHEN o PDF tem múltiplas páginas THEN o sistema SHALL renderizar todas as páginas como hoje (comportamento de `pdfParaInlineData` preservado).

**Independent Test**: Subir a imagem Docker de produção, enviar uma CNH em PDF pelo fluxo e observar a validação `cnh` retornar resultado (aprovado/rejeitado/pendência) — não erro de runtime. Confirmar ausência dos warnings de polyfill no log de boot.

---

### P2: Falha de cota do Gemini (429) é tratada e observável

**User Story**: Como operação, quero que o erro `429 prepayment credits depleted` seja identificado e tratado distintamente dos demais erros, para que eu saiba na hora que é problema de billing e não de código.

**Why P2**: Não impede a correção do P1, mas hoje o 429 esgota os retries e o candidato fica sem status terminal claro. Garantir desligamento do retry após o limite + status `PENDENCIA` + alerta evita trava e dá visibilidade operacional.

**Estratégia decidida:** manter o retry atual; após **3 tentativas** (esgotadas), **parar de tentar** e marcar `PENDENCIA`. Não há tentativa de distinguir billing de rate-limit pela mensagem — todo 429 segue a mesma regra.

**Acceptance Criteria**:

1. WHEN a API do Gemini retorna HTTP 429 THEN o sistema SHALL executar a estratégia de retry existente.
2. WHEN o retry atinge **3 tentativas sem sucesso** THEN o sistema SHALL **desabilitar novas tentativas** para aquela validação e finalizar o erro.
3. WHEN o retry de uma validação é esgotado (3 tentativas) THEN o pipeline SHALL atribuir status terminal `PENDENCIA` (análise manual) ao documento, sem prender o `Promise.allSettled` nem deixar `statusDocumentos` em `PROCESSANDO` para sempre.
4. WHEN o erro persistente é 429/cota THEN o sistema SHALL emitir alerta operacional (Telegram via `telegram-alert.ts`) com mensagem acionável ("Créditos Gemini esgotados — recarregar no AI Studio").

**Independent Test**: Simular resposta 429 do Gemini (mock/fixture) e verificar que (a) ocorrem no máximo 3 tentativas, (b) após o limite o documento recebe `PENDENCIA`, (c) um alerta é disparado, (d) o pipeline finaliza sem trava.

---

### P3: Documentação operacional (runbook) para billing e dependência nativa

> **Status:** incluído nesta entrega, documentado no `design.md` (decisão de 2026-06-06).

**User Story**: Como pessoa de plantão, quero um runbook curto, para que eu resolva esgotamento de créditos ou regressão do canvas sem reabrir a investigação.

**Why P3**: Reduz MTTR em incidentes recorrentes; é documentação, não bloqueia o fix.

**Acceptance Criteria**:

1. WHEN o time precisa recarregar créditos do Gemini THEN o runbook SHALL conter os passos (link AI Studio, qual env var / chave, como validar pós-recarga).
2. WHEN o time atualiza dependências de PDF THEN o runbook SHALL alertar sobre a dependência nativa `@napi-rs/canvas` e o risco do file-tracing do standalone.

---

## Edge Cases

- WHEN `@napi-rs/canvas` instala o binário de outra arquitetura (build em máquina ≠ runtime) THEN o sistema SHALL falhar no build (não em runtime), garantindo binário `linux` correto na imagem final.
- WHEN o PDF está corrompido/vazio THEN o sistema SHALL manter o comportamento atual (`throw 'PDF não contém páginas'`) — não regredir.
- WHEN o Gemini retorna 429 por **rate limit transitório** (não billing) THEN o sistema SHALL aplicar a mesma regra de qualquer 429: retry até 3 tentativas e, se esgotar, `PENDENCIA` + alerta (decisão de 2026-06-06: não distinguir billing de rate-limit).
- WHEN apenas parte das validações falha por cota e outras passam THEN o pipeline SHALL consolidar normalmente (falha isolada por tarefa, como já faz `Promise.allSettled`).
- WHEN o build standalone roda em CI/local com SO diferente de produção THEN o processo SHALL garantir o binário correto (ex.: instalar no estágio `deps` dentro do próprio Dockerfile linux, não copiar de host).

---

## Success Criteria

Como sabemos que o fix funcionou:

- [ ] Zero ocorrências de `DOMMatrix is not defined` e `Cannot find module '@napi-rs/canvas'` nos logs de produção após deploy.
- [ ] Validação `cnh` e `biometria` (PDF) retornam resultado de negócio (não erro de runtime) em produção.
- [ ] Erro 429 de billing produz status `PENDENCIA` + alerta Telegram, sem retries inúteis e sem trava do pipeline.
- [ ] `npm test` verde (incluindo novo teste de classificação de erro 429/billing) e `npx tsc --noEmit` limpo.
- [ ] Runbook publicado em `.specs/features/20260606-fix-validacao-producao/` (ou referenciado no de `migracao-coolify-vps`).

---

## Notas de Diagnóstico (referência)

Causa-raiz confirmada na análise de 2026-06-06:

| Validação | Erro observado | Causa raiz |
|---|---|---|
| `cnh`, `biometria` | `DOMMatrix is not defined` / `Cannot find module '@napi-rs/canvas'` | `@napi-rs/canvas` (dep nativa opcional do `pdfjs-dist`, carregada via `require` dinâmico) não é seguida pelo file-tracer do Next.js `output: 'standalone'` → ausente em `.next/standalone/node_modules` no Docker. |
| `comprovante`, `selfie`, `videoVeiculo`, `videoApp` | `429 ... prepayment credits are depleted` | Créditos pré-pagos da API Gemini esgotados (billing). Independente do código. |

Arquivos-chave: [lib/ai/gemini.ts](../../../lib/ai/gemini.ts) (`pdfParaInlineData` linha ~20, `MODEL`/retry linhas ~5-7), [next.config.ts](../../../next.config.ts) (`output: 'standalone'`, `serverExternalPackages`), [Dockerfile](../../../Dockerfile) (estágios `deps`/`builder`/`runner` com cópia de standalone), [lib/telegram-alert.ts](../../../lib/telegram-alert.ts).
