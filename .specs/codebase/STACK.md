# Tech Stack

**Analisado:** 2026-03-28

## Core

- Framework: Next.js 16.1.6 (App Router)
- Language: TypeScript 5
- Runtime: Node.js
- Package manager: npm

## Frontend

- UI Framework: React 19.2.3
- Styling: Tailwind CSS 4 (via @tailwindcss/postcss)
- State Management: useState local (fluxo linear, sem estado global)
- Animations: Framer Motion 12.35.2
- Form Handling: Controlado manualmente com useState

## Backend

- API Style: REST — Next.js API Routes (App Router route handlers)
- Database: MongoDB 7.1.0 (driver nativo, sem ORM)
- Authentication: Nenhuma (formulário público)

## Testing

- Unit: Nenhum framework configurado
- Integration: Nenhum
- E2E: Nenhum

## External Services

- Analytics: @vercel/analytics 2.0.0 (Vercel Analytics)
- Marketing: Meta CAPI (Conversions API) via Graph API v21.0
- Messaging: WhatsApp Business API via Meta Graph API v19.0
- Inbox Management: Chatwoot (via API REST interna)
- Alerts: Telegram Bot API
- Feature Flags: flags 4.0.4 (Vercel Flags)

## Development Tools

- Linter: ESLint 9 + eslint-config-next 16.1.6
- Types: @types/node, @types/react, @types/react-dom, @types/uuid
- Build: next build
- Deploy: Vercel
