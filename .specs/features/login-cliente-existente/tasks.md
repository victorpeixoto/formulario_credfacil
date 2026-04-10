# Login do Cliente Existente — Tasks

**Design**: `.specs/features/login-cliente-existente/design.md`
**Status**: ✅ Implementado — 2026-03-29

---

## T1 — `/api/check-cpf`: adicionar `temSenha` e `formCode` na resposta

**File**: `app/api/check-cpf/route.ts`

- Adicionar `temSenha: !!existingUser.senhaHash` na resposta
- Adicionar `formCode: existingUser.formCode` na resposta
- Status: ✅ Done

---

## T2 — `page.tsx`: ramificar redirecionamento por `temSenha`

**File**: `app/(public)/page.tsx` — função `handleExistingCPFSubmit`

- Se `exists && temSenha` → `/login?cpf={cpfLimpo}`
- Se `exists && !temSenha && formCode` → `/aprovado?id={formCode}`
- Se `exists && !temSenha && !formCode` → `/suporte-whatsapp` (fallback)
- Status: ✅ Done

---

## T3 — `/login`: pré-preencher CPF via searchParam

**File**: `app/(public)/login/page.tsx`

- Ler `params.get('cpf')` e inicializar estado com `formatarCPF(cpfParam)`
- Status: ✅ Done
