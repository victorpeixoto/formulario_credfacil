# State

**Last updated:** 2026-05-19
**Session:** Refatoração do pipeline de validação — modularização em `lib/ai/pipeline/`

---

## Current Focus

Refatoração do pipeline concluída (T42–T46). Feature "validacao-documentos-ia" na branch `feature/validacao-documentos-ia`.

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
- Não há testes automatizados — toda validação é manual ou via produção
- O `status` gravado no MongoDB é `'ETAPA_4'` (não `'ETAPA_5'`) — o n8n deve estar mapeado para isso
- `statusDocumentos: 'AGUARDANDO_DOCUMENTOS'` é o valor que indica primeiro acesso ao `/documentos`
- Portal do cliente não altera nenhuma API existente — zero risco de regressão no fluxo original
