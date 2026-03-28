# Architecture

**Pattern:** Monolito Next.js — App Router com Server Components + Client Components separados

## High-Level Structure

```
Candidato (browser)
    │
    ▼
Vercel Edge / CDN
    │
    ├── app/page.tsx            ← Client Component (formulário multi-card)
    ├── app/aprovado/page.tsx   ← Client Component (tela sucesso)
    ├── app/reprovado/page.tsx  ← Server Component (tela rejeição)
    ├── app/suporte-whatsapp/   ← Client Component (redirect)
    │
    └── app/api/
        ├── submit/route.ts     ← API Route (Node.js edge-compatible)
        ├── check-cpf/route.ts  ← API Route
        └── meta-capi/route.ts  ← API Route (proxy CAPI)
                │
                ├── MongoDB Atlas (collection: conversations)
                ├── Chatwoot API (listar inboxes disponíveis)
                ├── Meta Graph API (verificar status número WA)
                └── Telegram Bot API (alertas de falha)
```

## Identified Patterns

### Multi-Card Wizard (Formulário)

**Location:** `app/page.tsx`
**Purpose:** Guiar o candidato por 7 etapas sequenciais com estado local
**Implementation:** Único componente com `useState` para `card` (número atual) e `estado` (dados acumulados). Cada card é renderizado condicionalmente por `{card === N && <CardX ... />}`.
**Example:** `app/page.tsx` — controle via `avancar()`, `voltar()`, `avaliarEAvancar()`, `enviar()`

### Silent Evaluation

**Location:** `lib/avaliar.ts` + `app/page.tsx` (função `avaliarEAvancar`)
**Purpose:** Reprovar candidatos que não atingem critérios sem expor os motivos
**Implementation:** Após Card 4, `candidatoAprovado()` verifica faturamento, tempo e última entrega. Se reprovado, redireciona para `/reprovado` sem explicar o motivo.
**Example:** `lib/avaliar.ts` — critérios: faturamento < R$3.500, tempo < 3 meses, inativo > 30 dias

### Draft Persistence

**Location:** `app/page.tsx` (useEffects)
**Purpose:** Preservar preenchimento parcial contra recarregamentos acidentais
**Implementation:** A cada mudança de `card` ou `estado`, serializa para `localStorage('cf_draft')`. No mount, verifica rascunho e exibe banner de recuperação.

### WhatsApp Number Rotation

**Location:** `lib/whatsapp-rotation.ts`
**Purpose:** Distribuir candidatos entre múltiplos números WhatsApp ativos para evitar banimento
**Implementation:** Busca inboxes do Chatwoot, embaralha a lista (Math.random), verifica status de cada número via Meta Graph API (`quality_rating`, `status`), retorna primeiro `CONNECTED`.
**Example:** `getAvailableWhatsAppNumber(contactId)` — retorna `{whatsappNumber, whatsappLink}`

### Dual CAPI Tracking

**Location:** `app/page.tsx` + `app/aprovado/page.tsx` + `lib/meta-capi.ts`
**Purpose:** Rastrear conversões via Pixel (client-side) e CAPI (server-side) simultaneamente para deduplicação
**Implementation:** Pixel via `fbq()` no browser; CAPI via `/api/meta-capi` com dados hashed (SHA-256). Eventos rastreados: `Lead` (submit), `CompleteRegistration` (aprovado), `Purchase` (clique WA).

### Upsert por CPF

**Location:** `app/api/submit/route.ts`
**Purpose:** Evitar duplicatas e preservar `contactId` do Chatwoot se o candidato já existe
**Implementation:** `col.updateOne({ cpf }, { $set: {...} }, { upsert: true })`. Se já existe registro (veio do WhatsApp), mantém o `contactId` original.

## Data Flow

### Fluxo Principal (Novo Candidato)

```
1. Candidato acessa /
2. CardApresentacao → clica "Começar"
3. Cards 1-4 → avaliarEAvancar() → candidatoAprovado()?
   ├── Não → router.push('/reprovado')
   └── Sim → Cards 5-7
4. Card 7 Aceite → enviar()
5. POST /api/submit → valida → upsert MongoDB → getAvailableWhatsAppNumber()
6. router.push('/aprovado?id=...&link=...')
7. Candidato clica "Falar no WhatsApp" → abre wa.me com código UUID
```

### Fluxo CPF Existente

```
1. Candidato acessa / → clica "Já sou cliente"
2. CardCPFExistente → digita CPF
3. POST /api/check-cpf → busca MongoDB por CPF
   ├── Existe → router.push('/suporte-whatsapp?link=...')
   └── Não existe → inicia formulário normal
```

### Persistência MongoDB

```
Collection: conversations
Documento key: cpf (upsert)
Campos principais:
  - contactId: UUID v4 (ou ID do Chatwoot se existente)
  - formCode: UUID v4 (sempre novo por submit)
  - status: 'ETAPA_4' → sinaliza para n8n iniciar ETAPA_5
  - isCompleted: boolean
  - trabalho, referencias, dados pessoais, endereço
  - whatsappLink: link gerado após rotação
```

## Code Organization

**Approach:** Feature-based + Layer-based híbrido

**Module boundaries:**
- `components/cards/` — UI pura, sem lógica de negócio
- `lib/` — serviços e integrações, sem dependência de React
- `app/api/` — handlers HTTP, orquestram lib/
- `types/` — contratos compartilhados entre layers
