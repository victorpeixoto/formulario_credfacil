# State

**Last updated:** 2026-03-28
**Session:** Feature spec completa — Validação de Documentos com IA

---

## Current Focus

Feature "Validação de Documentos com IA" — spec, design e tasks aprovados. Pronto para implementação.

## Active Work

- Feature `validacao-documentos-ia`: spec.md, design.md e tasks.md completos (33 tasks, 6 phases)
- Migração do formulário da Vercel para VPS (Coolify) planejada como parte da feature

## Recent Decisions

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

- Conta Google Cloud (Gemini API) precisa ser criada
- Conta AWS (Rekognition) precisa ser criada
- Bucket Cloudflare R2 precisa ser criado
- Domínio para o formulário na VPS precisa ser configurado

## Preferences

- Documentação em português (idioma do domínio)
- Tarefas de atualização de estado (STATE.md, session handoff) funcionam bem com modelos mais rápidos/baratos

## Notes

- O arquivo `docs/formulario-credfacil-design.md` na raiz do projeto pai (`PROMPT-CREDFACIL/`) serve como design document de referência
- A lista `IGNORED_INBOX_IDS` em `lib/whatsapp-rotation.ts` está hardcoded — possível tech debt
- Não há testes automatizados — toda validação é manual ou via produção
- O `status` gravado no MongoDB é `'ETAPA_4'` (não `'ETAPA_5'` como descrito no design doc original) — o n8n deve estar mapeado para isso
