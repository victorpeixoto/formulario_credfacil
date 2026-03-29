# Roadmap

**Current Milestone:** MVP em Produção
**Status:** In Progress

---

## Milestone 1 — MVP Core

**Goal:** Formulário funcional coletando dados e redirecionando para WhatsApp
**Target:** Concluído (em produção na Vercel)

### Features

**Formulário Multi-Card** - COMPLETE

- 7 cards sequenciais com navegação avancar/voltar
- Card de apresentação com opção "Já sou cliente"
- Barra de progresso animada
- Animações de transição via Framer Motion

**Avaliação Silenciosa** - COMPLETE

- Critérios: faturamento >= R$3.500, tempo >= 3 meses, ativo nos últimos 30 dias
- Redirecionamento para /reprovado sem expor motivos
- Rastreamento de reprovações via Vercel Analytics

**Persistência e Submit** - COMPLETE

- Rascunho em localStorage com banner de recuperação
- POST /api/submit com validação server-side rigorosa
- Upsert por CPF no MongoDB (preserva contactId Chatwoot se existente)
- Geração de UUID v4 como formCode

**Rodízio de Números WhatsApp** - COMPLETE

- Busca inboxes disponíveis via Chatwoot API
- Verificação de status via Meta Graph API
- Embaralhamento aleatório para distribuição
- Alerta Telegram quando todos os números falham

**Páginas de Resultado** - COMPLETE

- /aprovado: exibe código UUID + botão wa.me
- /reprovado: tela de rejeição
- /suporte-whatsapp: redirect para candidatos com CPF existente

---

## Milestone 2 — Rastreamento e Analytics

**Goal:** Rastreamento completo de conversão para otimização de campanhas Meta Ads

### Features

**Meta CAPI Integration** - COMPLETE

- Proxy server-side /api/meta-capi
- Hashing SHA-256 de dados pessoais
- Deduplicação com Pixel (eventos: Lead, CompleteRegistration, Purchase)
- Captura de _fbc/_fbp cookies

**Vercel Analytics** - COMPLETE

- Eventos: form_auto_reproval, form_completed, whatsapp_click
- Vercel Flags por etapa para segmentação

---

## Milestone 3 — Resiliência e Fluxos Alternativos

**Goal:** Tratar casos de borda e usuários recorrentes

### Features

**Fluxo CPF Existente** - COMPLETE

- Card de verificação de CPF
- /api/check-cpf com lookup MongoDB
- Redirecionamento para suporte WhatsApp se já cadastrado

**Alertas de Operação** - COMPLETE

- Telegram alert quando todos os números estão indisponíveis

---

## Milestone 4 — Validação de Documentos com IA

**Goal:** Automatizar validação de documentos com IA, substituindo o envio manual via WhatsApp
**Status:** Planning complete — Ready for implementation

### Features

**Migração para VPS (Coolify)** - PLANNED

- Dockerfile de produção (Node 20 Alpine, standalone output)
- Novo serviço no Coolify com SSL via Traefik
- MongoDB acessado via rede interna Docker

**Autenticação do Candidato** - PLANNED

- Login CPF + senha (bcrypt + JWT httpOnly)
- Auto-login após cadastro de senha no /aprovado
- Recuperação de senha via email
- Middleware protegendo rotas /(auth)/*

**Upload de Documentos** - PLANNED

- 5 documentos: CNH, Comprovante, Selfie+Veículo, Vídeo App, Vídeo Veículo
- Upload direto para Cloudflare R2 via presigned URLs
- Validação client-side (formato, tamanho)

**Pipeline de Validação com IA** - PLANNED

- Gemini Flash: OCR de CNH e comprovante, análise de vídeos, extração de placa
- AWS Rekognition: comparação facial (selfie vs CNH)
- Cruzamento de dados: nome, CPF, placa, biometria
- Orquestração via Promise.allSettled na aplicação

**Progresso em Tempo Real** - PLANNED

- Server-Sent Events (SSE) na página /status
- Atualização visual documento a documento
- Resultado final: aprovado, pendência ou análise manual

**Reenvio de Documentos** - PLANNED

- Reenvio individual de documento rejeitado
- Limite de 3 tentativas por documento
- Escalação para analista via Telegram após 3 falhas

---

## Milestone 5 — Melhorias Futuras

**Goal:** Robustez, UX e observabilidade

### Features

**Testes Automatizados** - PLANNED

- Unit tests para `lib/avaliar.ts`, `lib/validators.ts` e validações IA
- Integration tests para API routes
- E2E com Playwright para o fluxo completo

**Área do Candidato Expandida** - PLANNED

- Página /perfil com dados pessoais
- Status do contrato, parcelas, histórico
- Notificações por email de mudanças de status

**Observabilidade** - PLANNED

- Logs estruturados nas API routes
- Monitoramento de taxa de reprovação
- Dashboard de conversão por etapa e por documento

---

## Future Considerations

- Integração direta com Chatwoot para criar contato automaticamente após submit
- Webhook para notificar n8n sem depender do candidato iniciar conversa
- Múltiplos idiomas (espanhol para expansão)
