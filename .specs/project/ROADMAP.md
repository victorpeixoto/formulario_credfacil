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

## Milestone 4 — Melhorias Futuras

**Goal:** Robustez, UX e observabilidade

### Features

**Testes Automatizados** - PLANNED

- Unit tests para `lib/avaliar.ts` e `lib/validators.ts`
- Integration tests para API routes
- E2E com Playwright para o fluxo completo

**Observabilidade** - PLANNED

- Logs estruturados nas API routes
- Monitoramento de taxa de reprovação
- Dashboard de conversão por etapa

**UX Improvements** - PLANNED

- Validação em tempo real no CardDadosPessoais (CPF, CEP com autocomplete)
- Feedback visual no rodízio de números (skeleton durante verificacao)

---

## Future Considerations

- Integração direta com Chatwoot para criar contato automaticamente após submit
- Webhook para notificar n8n sem depender do candidato iniciar conversa
- Múltiplos idiomas (espanhol para expansão)
