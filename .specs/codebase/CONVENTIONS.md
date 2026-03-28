# Code Conventions

## Naming Conventions

**Files:**
- Componentes React: PascalCase (`CardApps.tsx`, `CardWrapper.tsx`, `BotaoAvancar.tsx`)
- Utilitários/libs: camelCase (`avaliar.ts`, `mongodb.ts`, `whatsapp-rotation.ts`)
- API routes: kebab-case nas pastas (`check-cpf/`, `meta-capi/`), arquivo sempre `route.ts`
- Tipos: camelCase (`formulario.ts`)

**Components/Functions:**
- Componentes: PascalCase (`CardDadosPessoais`, `ProgressBar`)
- Funções de evento: camelCase descritivo (`avaliarEAvancar`, `handleExistingCPFSubmit`, `continuarRascunho`)
- Funções de lib: camelCase verbais (`candidatoAprovado`, `getAvailableWhatsAppNumber`, `sendMetaCAPIEvent`)

**Variables:**
- camelCase (`estadoInicial`, `rascunhoSalvo`, `cpfExistenteErro`)
- Estado form: nomes em português (`nomeCompleto`, `logradouro`, `estadoUF`)
- Constantes locais: UPPER_SNAKE_CASE (`DRAFT_KEY`, `TOTAL_CARDS`)

**Types/Interfaces:**
- PascalCase (`EstadoFormulario`, `PayloadSubmit`, `ChatwootInbox`)
- Types de domínio: PascalCase (`AppTrabalho`, `TempoAtuacao`, `FaixaFaturamento`)

## Code Organization

**Import ordering (observado em page.tsx):**
1. Bibliotecas externas (`next/navigation`, `framer-motion`, `flags/react`)
2. Componentes internos (`@/components/...`)
3. Libs internas (`@/lib/...`)
4. Tipos (`@/types/...`)
5. Hooks React (`react`)

**Path aliases:**
- `@/` → raiz do projeto (configurado em tsconfig.json)

**File Structure (componentes):**
```tsx
'use client'; // se necessário

// imports

// interfaces locais (se necessário)

// funções helper puras

export default function NomeComponente({ props }: Props) {
  // hooks
  // handlers
  // render
}
```

## Type Safety

**Approach:** TypeScript strict, tipos de domínio em `types/formulario.ts`
**Uso de `type` vs `interface`:** `type` para unions/primitivos, `interface` para objetos estruturais
**Exemplo:**
```ts
export type FaixaFaturamento = 'menos_2k' | '2k_3500' | '3500_5k' | 'mais_5k';
export interface EstadoFormulario { apps: AppTrabalho[]; ... }
```

**`any` explícito:** Usado pontualmente com cast `(window as any).fbq` para APIs externas sem types

## Error Handling

**API Routes:** try/catch com `NextResponse.json({ erro: '...' }, { status: N })`
**Client:** try/catch com `alert()` para erros de submit (tratamento simples)
**Lib functions:** console.error + retorno nulo/boolean (ex: `return null`, `return false`)
**Validação server:** Guard clauses sequenciais retornando 400 antes de qualquer operação

**Exemplo (route handler):**
```ts
if (!campo?.trim()) return NextResponse.json({ erro: 'Campo obrigatório.' }, { status: 400 });
```

## Comments/Documentation

**Estilo:** Comentários inline em português para contexto de negócio
**Quando usar:** Decisões não óbvias, workarounds, sequenciamento importante
**Exemplos observados:**
```ts
// Salva no MongoDB ANTES de verificar WhatsApp (garante registro mesmo se todos números estiverem indisponíveis)
// Se já existe registro (ex: veio do WhatsApp direto), preserva o contactId do Chatwoot
// Embaralha as inboxes para garantir aleatoriedade no rodízio e não pegar sempre o mesmo
```

## Language

**Domínio:** Português (nomes de variáveis, comentários, mensagens de erro ao usuário)
**Técnico:** Inglês (nomes de padrões, APIs externas, console.error)
