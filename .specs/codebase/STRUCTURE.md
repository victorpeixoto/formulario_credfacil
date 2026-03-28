# Project Structure

**Root:** `formulario-credfacil/`

## Directory Tree

```
formulario-credfacil/
├── .specs/                     # Spec-driven docs (este projeto)
├── app/
│   ├── page.tsx                # Formulário principal (8 cards)
│   ├── layout.tsx              # Layout raiz (meta, analytics, pixel)
│   ├── globals.css             # Estilos globais Tailwind
│   ├── aprovado/
│   │   └── page.tsx            # Tela de sucesso + botão wa.me
│   ├── reprovado/
│   │   └── page.tsx            # Tela de rejeição
│   ├── suporte-whatsapp/
│   │   └── page.tsx            # Redirect para suporte (CPF existente)
│   └── api/
│       ├── submit/route.ts     # POST: valida, persiste, retorna link WA
│       ├── check-cpf/route.ts  # POST: verifica CPF duplicado
│       └── meta-capi/route.ts  # POST: proxy eventos Meta CAPI
├── components/
│   ├── CardApresentacao.tsx    # Tela inicial (Começar / Já sou cliente)
│   ├── CardWrapper.tsx         # Animação de transição entre cards
│   ├── ProgressBar.tsx         # Barra de progresso (etapa X de Y)
│   ├── BotaoAvancar.tsx        # Botão reutilizável de avanço
│   └── cards/
│       ├── CardApps.tsx        # Card 1: seleção de apps
│       ├── CardTempo.tsx       # Card 2: tempo de atuação
│       ├── CardUltimaEntrega.tsx # Card 3: última entrega
│       ├── CardFaturamento.tsx # Card 4: faturamento mensal
│       ├── CardReferencias.tsx # Card 5: 4 referências pessoais
│       ├── CardDadosPessoais.tsx # Card 6: dados pessoais + endereço
│       ├── CardAceite.tsx      # Card 7: aceite das condições
│       └── CardCPFExistente.tsx # Fluxo paralelo: CPF já cadastrado
├── lib/
│   ├── mongodb.ts              # Singleton de conexão MongoDB
│   ├── avaliar.ts              # Lógica de avaliação silenciosa
│   ├── validators.ts           # Funções de validação (CPF, tel, etc.)
│   ├── whatsapp-rotation.ts    # Rodízio de números via Chatwoot + Graph API
│   ├── meta-capi.ts            # Client Meta Conversions API
│   └── telegram-alert.ts      # Alertas via Telegram Bot
├── types/
│   └── formulario.ts           # Tipos globais do domínio
├── public/                     # Assets estáticos
├── .env.local                  # Variáveis de ambiente (não commitado)
├── .env.local.example          # Template de variáveis
├── next.config.ts
├── tailwind.config (inline via postcss.config.mjs)
└── tsconfig.json
```

## Module Organization

### App (Pages & API)

**Purpose:** Rotas Next.js — UI pages e API handlers
**Location:** `app/`
**Key files:** `page.tsx` (orquestrador principal), `api/submit/route.ts`

### Components

**Purpose:** Componentes React reutilizáveis e cards do formulário
**Location:** `components/`
**Key files:** `CardWrapper.tsx` (animação), `cards/*` (cada etapa do fluxo)

### Lib

**Purpose:** Serviços, utilitários e integrações externas
**Location:** `lib/`
**Key files:** `mongodb.ts`, `whatsapp-rotation.ts`, `meta-capi.ts`

### Types

**Purpose:** Definições TypeScript do domínio
**Location:** `types/formulario.ts`

## Where Things Live

**Formulário (fluxo principal):**
- UI/Cards: `components/cards/`
- Orquestração: `app/page.tsx`
- Avaliação: `lib/avaliar.ts`
- Persistência rascunho: localStorage via `app/page.tsx`

**Submit do formulário:**
- Frontend: `app/page.tsx` (função `enviar()`)
- API: `app/api/submit/route.ts`
- DB: `lib/mongodb.ts`
- WhatsApp: `lib/whatsapp-rotation.ts`

**Rastreamento de conversão:**
- Pixel (client): `app/layout.tsx` + `app/page.tsx`
- CAPI (server): `lib/meta-capi.ts` + `app/api/meta-capi/route.ts`
