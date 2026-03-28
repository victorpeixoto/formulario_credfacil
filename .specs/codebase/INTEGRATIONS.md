# External Integrations

## Database

**Service:** MongoDB Atlas
**Purpose:** Persistir dados do candidato, estado do processo de crédito
**Implementation:** `lib/mongodb.ts` — singleton via `clientPromise` com reconexão gerenciada
**Configuration:** `MONGODB_URI` em `.env.local`
**Authentication:** Connection string com usuário/senha no URI
**Collection:** `credfacil.conversations`
**Key schema fields:** `cpf` (upsert key), `contactId`, `formCode`, `status`, `isCompleted`, `trabalho`, `referencias`, dados pessoais

---

## WhatsApp (Meta Business API)

**Service:** Meta Graph API v19.0
**Purpose:** Verificar disponibilidade de números WhatsApp Business e gerar links wa.me
**Implementation:** `lib/whatsapp-rotation.ts`
**Authentication:** `api_key` (token de acesso) por inbox, recuperado via Chatwoot
**Key endpoints:**
- `GET https://graph.facebook.com/v19.0/{phoneNumberId}?fields=quality_rating,status,display_phone_number`
**Configuration:** Tokens recuperados dinamicamente via Chatwoot API (sem env vars diretas)

---

## Chatwoot

**Service:** Chatwoot (instância própria)
**Purpose:** Gerenciar inboxes WhatsApp disponíveis para rodízio de números
**Implementation:** `lib/whatsapp-rotation.ts` — função `fetchInboxesFromChatwoot()`
**Authentication:** `CHATWOOT_API_TOKEN` (header `api_access_token`)
**Configuration:**
- `CHATWOOT_API_URL` — endpoint de listagem de inboxes
- `CHATWOOT_API_TOKEN` — token de acesso à API
**Filtro:** Ignora inboxes com IDs hardcoded `[1, 3, 9, 13, 15, 16, 21, 22, 24]`
**Campos usados:** `id`, `name`, `phone_number`, `provider_config.api_key`, `provider_config.phone_number_id`

---

## Meta Conversions API (CAPI)

**Service:** Meta Graph API v21.0 — Conversions API
**Purpose:** Rastreamento server-side de eventos de conversão (deduplica com Pixel)
**Implementation:** `lib/meta-capi.ts` + `app/api/meta-capi/route.ts` (proxy)
**Authentication:**
- `META_ACCESS_TOKEN` — token de acesso Meta
- `META_PIXEL_ID` — ID do Pixel
**Key endpoint:** `POST https://graph.facebook.com/v21.0/{pixelId}/events`
**Events tracked:**
- `Lead` — após submit do formulário
- `CompleteRegistration` — na página de aprovado
- `Purchase` — clique no botão WhatsApp
**Data hashing:** SHA-256 em email, telefone, nome, cidade (via `crypto.createHash`)

---

## Meta Pixel (Client-side)

**Service:** Meta Pixel (Facebook Pixel)
**Purpose:** Rastreamento client-side de eventos (complementa CAPI)
**Implementation:** Script injetado em `app/layout.tsx`
**Events:** `Lead`, `CompleteRegistration`, `Purchase`
**Cookies usados:** `_fbc`, `_fbp` (passados para CAPI via server)

---

## Telegram Bot API

**Service:** Telegram Bot API
**Purpose:** Alertas de falha quando todos os números WhatsApp estão indisponíveis
**Implementation:** `lib/telegram-alert.ts` — `sendTelegramAlert(message)`
**Authentication:**
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
**Trigger:** Chamado em `whatsapp-rotation.ts` quando nenhum número passa na verificação

---

## Vercel Analytics

**Service:** Vercel Analytics (`@vercel/analytics`)
**Purpose:** Analytics de uso do formulário
**Implementation:** `track()` em eventos chave
**Events tracked:**
- `form_auto_reproval` — reprovas silenciosas (faturamento, tempo, ultimaEntrega)
- `form_completed` — submits com sucesso
- `whatsapp_click` — cliques no botão WhatsApp

---

## Vercel Flags

**Service:** Vercel Feature Flags (`flags` package v4.0.4)
**Purpose:** Segmentação por etapa para analytics
**Implementation:** `FlagValues` em cada card com `etapa: 'etapa_N'`

---

## n8n (Externo — não integrado diretamente)

**Service:** n8n (automação de fluxo)
**Purpose:** Orquestrar ETAPA_5 após candidato iniciar WhatsApp
**Integration point:** Candidato envia mensagem com UUID -> n8n detecta "Meu código é: {UUID}" -> busca MongoDB por `contactId` -> inicia ETAPA_5
**Ajuste necessário no n8n:** Adicionar condição no inicio do workflow para interceptar mensagens com código

---

## Variaveis de Ambiente Completas

```
MONGODB_URI=mongodb+srv://...
CHATWOOT_API_URL=https://chatwoot.exemplo.com/api/v1/accounts/{id}/inboxes
CHATWOOT_API_TOKEN=...
META_ACCESS_TOKEN=...
META_PIXEL_ID=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```
