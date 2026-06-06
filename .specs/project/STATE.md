# State

**Last updated:** 2026-06-06
**Session:** Spec da correção de falhas de validação em produção (PDF/canvas + 429 Gemini)

---

## Current Focus (2026-06-06)

Feature **`20260606-fix-validacao-producao` parcialmente implementada** em 2026-06-06.
- **Concluído:** T1-T3 e T5-T10 em `.specs/features/20260606-fix-validacao-producao/tasks.md`.
- **Track A:** `@napi-rs/canvas@0.1.100` declarado em `dependencies` e dedupado com `pdfjs-dist`; `next.config.ts` inclui `@napi-rs/canvas` em `serverExternalPackages` e `outputFileTracingIncludes`; `Dockerfile` recebeu fallback `COPY` do pacote e dos binários Linux `@napi-rs/canvas-linux-*` com `--chown=nextjs:nodejs`; runner tem `HEALTHCHECK` em `/api/health` e usa apenas `curl` (sem `wget`).
- **Track B:** `GeminiQuotaError` + `isQuotaError` em `lib/ai/gemini.ts`; 429/`RESOURCE_EXHAUSTED`/`credits are depleted` tenta no máximo 3 vezes no Gemini e não recebe retry extra em `executar-validacoes.ts`; `executarPipeline` dispara 1 alerta Telegram por execução com "Créditos Gemini esgotados — recarregar no AI Studio" quando há erro de cota.
- **Testes/validações locais:** `npm ls @napi-rs/canvas` OK; `npm test` 34/34 verde; `npx tsc --noEmit` limpo; `npx eslint` nos arquivos tocados limpo; `docker build -t formulario-credfacil-docker-validate .` OK; dentro do container `createCanvas(1,1)` OK; `/api/health` OK e container `healthy`.
- **Pendente:** T4 validação funcional em container/staging com PDF real (CNH/biometria) para confirmar ausência de `DOMMatrix is not defined` no fluxo completo.

Criada feature **`20260606-fix-validacao-producao`** (`spec.md` + `design.md` + `tasks.md`) para dois erros de produção observados nos logs do `POST /api/validacao/iniciar`:

1. **PDF não renderiza** (`cnh`/`biometria`): `@napi-rs/canvas` (dep nativa opcional do `pdfjs-dist` via `pdf-to-img`) ausente no `.next/standalone` do Docker → `DOMMatrix is not defined`. **Track A:** declarar dep em `package.json` + `outputFileTracingIncludes` no `next.config.ts` (+ fallback `COPY` no Dockerfile). Sem mudança de lógica.
2. **Cota Gemini esgotada** (`comprovante`/`selfie`/vídeos): `429 prepayment credits depleted`. **Track B:** padronizar retry em **3 tentativas** (decisão do usuário); novo `GeminiQuotaError` em `gemini.ts` (autoridade do retry), `executarComRetry` não re-tenta cota (evita ~6 chamadas), erro → `PENDENCIA` (já existe via `determinar-status.ts`) + alerta Telegram de cota no `executarPipeline`.

**Track C (P3):** runbooks (recarga de créditos Gemini + regressão do canvas) escritos dentro do `design.md`.

**Decisões confirmadas (perguntas TLC):** 429 = manter retry, 3 tentativas, depois `PENDENCIA`, sem distinguir billing×rate-limit; runbook incluído no design; escopo P1+P2+P3.

**Ação humana fora do código:** recarregar créditos / trocar `GEMINI_API_KEY` no AI Studio (resolve o 429 imediato).

**Próximo passo:** aprovar tasks e implementar (Track A e Track B são independentes; ver `tasks.md`).

---

## Current Focus (2026-06-04 — sessão tarde)

**Bug urgente `86ahf46z7` implementado localmente** ([BUG] Análise da IA travando +30 min no iPhone). Spec em `.specs/features/20260604-bug-analise-trava-iphone/` atualizada.
- **Causa primária:** sem timeout nas tarefas — `executar-validacoes.ts` (`Promise.allSettled` + `await fn()` sem timeout) + `fetch`/`generateContent` sem `AbortSignal`. Uma tarefa travada (vídeo `.mov` grande do iPhone) prende o pipeline → `statusDocumentos` fica `PROCESSANDO` para sempre.
- **Agravantes:** `.catch()` em `iniciar/route.ts` só loga (falha silenciosa); frontend `status/page.tsx` reconecta sem limite e ignora o evento SSE `erro` (timeout de 10 min em `status/route.ts`) → ~30 min sem feedback.
- **Fix aplicado (defense-in-depth, não toca cruzamento/decisão):** (1) timeout/tarefa = **120s** (`TIMEOUT_VALIDACAO_MS`), parametrizável nos testes; (2) status terminal `PENDENCIA` no catch do pipeline; (3) listener SSE `erro`, limite de **5** reconexões e aviso com botão "Recarregar" no front.
- **Validação local:** `npm test` 31/31 verde; `npx tsc --noEmit` limpo; `npx eslint` nos arquivos tocados limpo.
- **Pendente:** teste manual no iPhone/staging com vídeo grande e atualização do ClickUp `86ahf46z7` após merge.
- **Validações de tasks ClickUp em progresso/to do** concluídas e comentadas; cards implementados movidos para `complete` (`86ahw4mfb`, `86ahw4mc7`, `86ahw4m0p`, `86ahf4g21`, `86ahw4ktu` consolidado, `86ahw4m6u`).

## Current Focus (2026-06-04)

Criadas **4 features separadas** (uma por card, a pedido), todas em `.specs/features/` com `spec.md` + `design.md` + `tasks.md`. Lista ClickUp 901327209475, todas `in progress` / *high*. (O 5º card original, `86ahw4ktu` "PDF preferencial/flexibilizar sombra", foi **descartado e consolidado** no card de CNH.)

1. `20260604-continuar-com-item-rejeitado` — `86ahw4mfb` — vídeo do veículo rejeitado **não bloqueia** o botão "Continuar Análise → WhatsApp" na tela de status (`app/(auth)/status/page.tsx`: `SecaoContato` hoje só em `APROVADO`/`ANALISE_MANUAL`; liberar em `PENDENCIA` quando `videoVeiculo` rejeitado), mantendo o reenvio. Sem mudança no pipeline.
2. `20260604-remover-validacao-placa-video-veiculo` — `86ahw4mc7` — cruzamento de placa em `avaliar-cruzamento.ts` passa a ser **só selfie × vídeo do app** (remover `videoVeiculo?.placa` da linha ~144 e do loop de rejeição ~169; ajustar `MOTIVO_PLACA`); `video-veiculo.ts` para de extrair placa.
3. `20260604-instrucoes-cnh-digital` — `86ahw4m0p` (+ relacionada `86ahw4m6u`) — **spec consolidada da CNH**: (a) cópia PDF obrigatório do app CNH Digital, (b) captura aceita só `.pdf` para a CNH (enforcement absorvido do `86ahw4ktu`), (c) **validade ≥ 30 dias** em `cnh.ts` + `DIAS_MINIMOS_VALIDADE_CNH=30` no `config.ts`.
4. `20260604-fluxo-alternativo-comprovante-residencia` — `86ahf4g21` — **escopo enxuto**: apenas CTA "comprovante não está no meu nome" → afirmar terceiro/parente → texto "enviar doc do titular na próxima etapa" → `analise_manual`. Reaproveita `determinar-status.ts` e o banner da tela de status (~274-301).

Ordem sugerida: 1 → 2 → 3 → 4.
Decisões em aberto (card 1): liberar WhatsApp sempre que vídeo do veículo rejeitado vs. só quando é a única rejeição.
Decisões em aberto (card 3): exceção para quem não tem CNH Digital (bloquear foto totalmente vs. permitir como exceção).
Decisões em aberto (card 4): coletar grau de parentesco ou só afirmar; reusar `comprovanteNomeDivergente` vs. flag nova.

---

## Current Focus

Feature **`refatoracao-pipeline-validacao`** IMPLEMENTADA (T1–T10 ✅). Resumo:
- **Rede de segurança (T1–T2):** runner de testes configurado (`npm test` = Node `--test` nativo + TS + loader de alias `@/`, **zero dependências novas**); 11 fixtures + oráculo AS-IS (`cruzamento-atual.ts`) — baseline verde.
- **Fundação (T3–T5):** thresholds centralizados em `config.ts`; novo módulo puro `avaliar-cruzamento.ts` (substitui `cruzamento-inline.ts` + `cruzarDados` na produção); regressão `avaliarCruzamento === baseline` campo a campo (24/24 verdes).
- **Pipeline (T6–T9):** `executarValidacoes` paralelizado (`Promise.allSettled`, sem delay 2s, falha isolada); `validar*` sem cruzamento (comprovante/video-app/biometria usam config); SSE `mapearStatus` corrige `analise_manual`; `executarPipeline` reescrito = 1 read + 1 update de progresso + 1 write consolidado, placa entre fontes movida p/ `avaliarCruzamento`.
- **UI (T10):** já preparada (`STATUS_CONFIG.analise_manual`); T8 destravou a emissão.
- **Pendente (T11):** medir `<60s` de parede e rodar casos manuais aprovado/pendência/análise-manual em **dev/staging** (precisa de credenciais Gemini/Rekognition/Mongo/R2). Lógica já travada pela regressão.

Verificação offline: `tsc --noEmit` limpo, lint dos arquivos tocados limpo, `npm test` 24/24.
Obs.: `cruzamento.ts` (cruzarDados) e `cruzamento-inline.ts` permanecem como **referência de baseline dos testes** (oráculo) — não mais no caminho de produção.

Sessão anterior: Refatoração do pipeline concluída (T42–T46). Feature "validacao-documentos-ia" na branch `feature/validacao-documentos-ia`.

**BUG CRÍTICO RESOLVIDO** — `[BUG] IA aprovou cadastro com nomes divergentes entre aplicativo e documentos` (ClickUp `86ahg6bqq`).  
Fix implementado, commitado (`6648b48`), pushed e task marcada como `complete` no ClickUp.

## Active Work

- Branch `feature/validacao-documentos-ia`: TypeScript ✅ sem erros, build ✅
- Aguardando testes manuais E2E no celular via Vercel Preview (T33)
- Próximo passo: merge para master após validação

## Recent Decisions

- **2026-05-24:** Migração Coolify VPS planejada e preparada para execução local
  - Deploy shape: Next.js standalone monolith in Coolify
  - Backend/frontend split intentionally deferred
  - Rollback: Vercel remains fallback until production validation completes
  - Spec: `.specs/features/migracao-coolify-vps/`

- **2026-05-19:** Refatoração do pipeline de validação — modularização em `lib/ai/pipeline/` (T42–T46)
  - Problema: `executarPipeline` em `route.ts` (~300 linhas) misturava loop com retry, cruzamento inline por documento, e lógica de status final
  - Solução: 4 módulos criados + `route.ts` reescrito como orquestrador de ~130 linhas
  - `config.ts` — constantes de threshold centralizadas (THRESHOLD_NOME=85, THRESHOLD_BIOMETRIA=90, etc.)
  - `executar-validacoes.ts` — loop sequencial com retry, delay e callback
  - `cruzamento-inline.ts` — cruzamento por tipo (CNH, comprovante, biometria, videoApp) com funções nomeadas
  - `determinar-status.ts` — decisão APROVADO/PENDENCIA/ANALISE_MANUAL isolada e testável
  - Comportamento externo preservado: mesmo MongoDB, mesmos SSE, mesmos alertas Telegram

- **2026-05-18:** Bug crítico implementado e deployado — commit `6648b48`
  - T1: log diagnóstico de `cadastro.nomeCompleto` no início do pipeline
  - T2: cruzamento de nome da CNH corrigido (guard, sem cálculo duplicado, log)
  - T3: cruzamento de `nomePerfil` do videoApp contra cadastro adicionado
  - T4: `divergenciaIdentidade` bloqueia `statusDocumentos = APROVADO` quando `validacaoIA` detecta divergência
  - ClickUp `86ahg6bqq` → `complete`

- **2026-05-18:** Bug crítico identificado e planejado — IA aprovando nomes divergentes
  - Causa raiz: bloco de nome da CNH pode ter bug silencioso; vídeo do app nunca tem nome comparado com cadastro; `validacaoIA` não é considerado no status final
  - Solução: 4 tasks localizadas em `app/api/validacao/iniciar/route.ts`, ~75 min de implementação
  - Spec em `.specs/features/bug-nome-divergente/`

- **2026-05-10:** Portal do Cliente implementado (T34/T35)
  - `/status` reescrita como portal com saudação personalizada, barra de progresso e cards de documentos
  - `GET /api/candidato` — nova API que retorna nome, CPF mascarado, statusDocumentos e status por documento
  - `components/portal/card-documento.tsx` — card visual com badge de status, motivo, animação pulse
  - `components/portal/reenvio-documento.tsx` — reenvio individual reutilizando componentes de captura existentes
  - `components/portal/secao-contato.tsx` — seção WhatsApp quando todos aprovados
  - `/documentos` protegida: redireciona para portal se já tem documentos enviados
  - Login: flag `temDocumentos` retornada, frontend redireciona para `/status` quando true
- **2026-05-09:** Correção do erro 500 na rota `/api/validacao/iniciar` na Vercel
  - `pdf-to-img` convertido para import dinâmico em `rekognition.ts`
  - `sharp` convertido para import dinâmico em `gemini.ts`
  - Handler POST envolvido em try-catch com resposta JSON estruturada
- **2026-03-29:** Gap identificado no fluxo "Já sou cliente" — candidatos com conta eram redirecionados para WhatsApp em vez de /login. Solução implementada no portal: login retorna `temDocumentos`, frontend redireciona conforme.
- **2026-03-29:** Implementação completa da feature em 6 fases (T1-T32)
- **2026-03-28:** Feature "Validação de Documentos com IA" desenhada e aprovada

## Blockers

~~- Conta Google Cloud (Gemini API) precisa ser criada — necessária para testes reais~~
~~- Conta AWS (Rekognition) precisa ser criada — necessária para testes reais~~
~~- Bucket Cloudflare R2 precisa ser criado — necessário para testes de upload~~
~~- Domínio para o formulário na VPS precisa ser configurado — necessário para deploy~~

- Testes manuais E2E (T33) pendentes no celular real — simulação no Chrome não abre câmera nativamente
- Build local falha por bug pré-existente do Next.js 16 + Turbopack + `output: 'standalone'` (não impacta Vercel)

## Preferences

- Documentação em português (idioma do domínio)
- Tarefas de atualização de estado (STATE.md, session handoff) funcionam bem com modelos mais rápidos/baratos

## Notes

- A lista `IGNORED_INBOX_IDS` em `lib/whatsapp-rotation.ts` está hardcoded — possível tech debt
- ~~Não há testes automatizados~~ → Agora há regressão do cruzamento via `npm test` (Node `--test` nativo, sem deps). Demais áreas seguem sem testes.
- O `status` gravado no MongoDB é `'ETAPA_4'` (não `'ETAPA_5'`) — o n8n deve estar mapeado para isso
- `statusDocumentos: 'AGUARDANDO_DOCUMENTOS'` é o valor que indica primeiro acesso ao `/documentos`
- Portal do cliente não altera nenhuma API existente — zero risco de regressão no fluxo original
