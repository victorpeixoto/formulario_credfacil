# State

**Last updated:** 2026-03-29
**Session:** Spec criada — Login do Cliente Existente (gap no fluxo "Já sou cliente")

---

## Current Focus

Feature "Login do Cliente Existente" — spec criada em `.specs/features/login-cliente-existente/spec.md`. Próximo passo: design e tasks para implementação.

Feature "Validação de Documentos com IA" — implementada na branch `feature/validacao-documentos-ia`. Pendente: testes manuais (T33) e merge/deploy em produção.

## Active Work

- Feature "Login do Cliente Existente": spec aprovada, aguardando design + tasks
- Branch `feature/validacao-documentos-ia`: 7 commits, build ✅ sem erros
- Próximo passo: testes manuais end-to-end (T33) antes do merge para master

## Recent Decisions

- **2026-03-29:** Gap identificado no fluxo "Já sou cliente" — candidatos com conta eram redirecionados para WhatsApp em vez de /login. Spec criada para feature "Login do Cliente Existente". Solução: `/api/check-cpf` retorna `temSenha`, frontend ramifica para login ou criação de senha.
- **2026-03-29:** Implementação completa da feature em 6 fases (T1-T30)
  - T1-T5: dependências, tipos TypeScript, route groups `(public)`/`(auth)`, `.env.local.example`
  - T6-T10: `lib/auth.ts`, `lib/r2.ts`, `lib/ai/gemini.ts`, `lib/ai/rekognition.ts`, `lib/email.ts`
  - T11-T16, T21: validações individuais + `lib/ai/cruzamento.ts` (Levenshtein)
  - T17-T24: 7 API routes + `middleware.ts` (JWT httpOnly, rate limit 5 tentativas)
  - T25-T29: páginas `/login`, `/aprovado` (redesign), `/documentos`, `/status` (SSE), `/redefinir-senha`
  - T30: `Dockerfile` multi-stage Alpine + `next.config.ts` output standalone
  - T31/T32: reenvio de documentos e alerta Telegram integrados no `iniciar/route.ts`
- **2026-03-28:** Feature "Validação de Documentos com IA" desenhada e aprovada
  - Abordagem: monolito estendido (sem n8n, sem worker separado)
  - Infra: migração para VPS Hostinger com Coolify (container Docker)
  - Storage: Cloudflare R2 (presigned URLs, path com formCode UUID)
  - IA: Google Gemini Flash (OCR, vídeo) + AWS Rekognition (biometria)
  - Auth: CPF + senha, JWT httpOnly, auto-login após cadastro
  - UX: Progresso em tempo real via SSE, reenvio com limite de 3 tentativas
  - Selfie cumpre dupla função: placa (Gemini) + biometria (Rekognition)
  - Botão WhatsApp movido para após aprovação dos documentos
- **2026-03-28:** Criado .specs completo via brownfield mapping do codebase existente

## Blockers

- Conta Google Cloud (Gemini API) precisa ser criada — necessária para testes reais
- Conta AWS (Rekognition) precisa ser criada — necessária para testes reais
- Bucket Cloudflare R2 precisa ser criado — necessário para testes de upload
- Domínio para o formulário na VPS precisa ser configurado — necessário para deploy

## Preferences

- Documentação em português (idioma do domínio)
- Tarefas de atualização de estado (STATE.md, session handoff) funcionam bem com modelos mais rápidos/baratos

## Notes

- O arquivo `docs/formulario-credfacil-design.md` na raiz do projeto pai (`PROMPT-CREDFACIL/`) serve como design document de referência
- A lista `IGNORED_INBOX_IDS` em `lib/whatsapp-rotation.ts` está hardcoded — possível tech debt
- Não há testes automatizados — toda validação é manual ou via produção
- O `status` gravado no MongoDB é `'ETAPA_4'` (não `'ETAPA_5'` como descrito no design doc original) — o n8n deve estar mapeado para isso
