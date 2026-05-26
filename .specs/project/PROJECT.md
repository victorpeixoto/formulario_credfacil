# Formulário Credfácil

**Vision:** Formulário web animado mobile-first que substitui as etapas de coleta de dados do bot WhatsApp, eliminando o risco de banimento pela Meta ao mover dados sensíveis para um canal controlado.

**For:** Motoristas de aplicativo (Uber, 99, iFood, etc.) que buscam crédito consignado pela Credfácil

**Solves:** Bot WhatsApp estava sendo banido pela Meta por coletar CPF e endereço diretamente no chat — padrão detectado como phishing/spam. O formulário web elimina esse vetor e mantém o WhatsApp apenas para o contato final.

## Goals

- Coletar dados dos candidatos sem risco de banimento do WhatsApp (sucesso = zero bans por coleta de dados após go-live)
- Qualificar candidatos silenciosamente antes de registrá-los (critério: faturamento >= R$3.500, tempo >= 3 meses, ativo nos últimos 30 dias)
- Distribuir candidatos aprovados entre múltiplos números WhatsApp via rodízio para maximizar disponibilidade

## Tech Stack

**Core:**
- Framework: Next.js 16.1.6 (App Router)
- Language: TypeScript 5
- Database: MongoDB Atlas (collection `credfacil.conversations`)

**Key dependencies:** Framer Motion 12 (animações), mongodb 7 (driver nativo), uuid 13 (contactId), @vercel/analytics (rastreamento), flags (Vercel Flags)

## Scope

**v1 inclui:**
- Formulário de 6 cards animados com avaliação silenciosa
- Persistência de rascunho via localStorage
- Rodízio de números WhatsApp via Chatwoot + Meta Graph API
- Rastreamento dual (Pixel + CAPI) para Meta Ads
- Fluxo de CPF existente (redirect para suporte ou login)
- Alertas Telegram em caso de falha de números
- Autenticação de candidatos: login CPF + senha, JWT httpOnly, recuperação por email
- Upload de 5 documentos via Cloudflare R2 (presigned URLs)
- Pipeline de validação com IA: Gemini Flash (OCR) + AWS Rekognition (biometria)
- Progresso em tempo real via SSE
- Portal do cliente (/status): status visual por documento, reenvio individual inline, seção WhatsApp pós-aprovação
- Redirect inteligente: login e /documentos redirecionam para portal quando candidato já tem documentos

**Explicitamente fora de escopo (v1):**
- Painel de gestão (está em projeto separado `painel-credfacil`)
- Notificações push/email de mudanças de status
- Dashboard de conversão e observabilidade
- Testes automatizados (unit, integration, E2E)
- Integração direta com Chatwoot para criar contato

**v2 planejado (Milestone 5):**
- Testes automatizados (Jest, Playwright)
- Área do candidato expandida (/perfil, histórico)
- Observabilidade (logs estruturados, dashboard de conversão)

## Constraints

- Timeline: Projeto já em produção na Vercel
- Technical: Deve usar MongoDB existente (collection `conversations`) para compatibilidade com n8n/ETAPA_5
- Resources: Projeto independente de `painel-credfacil` — deploy separado na Vercel
