# Login do Cliente Existente — Design

**Spec**: `.specs/features/login-cliente-existente/spec.md`
**Status**: ✅ Pronto para implementação

---

## Fluxo Atual vs Novo

```
ATUAL:
"Já sou cliente" → CPF → /api/check-cpf → exists? → /suporte-whatsapp
                                                     → iniciar formulário

NOVO:
"Já sou cliente" → CPF → /api/check-cpf → exists + temSenha  → /login?cpf={cpf}
                                         → exists + !temSenha → /aprovado?id={formCode}
                                         → !exists            → iniciar formulário
```

---

## Alterações por Arquivo

### 1. `/api/check-cpf/route.ts`

Adicionar `temSenha` na resposta quando `exists: true`:

```ts
return NextResponse.json({
  exists: true,
  temSenha: !!existingUser.senhaHash,   // NOVO
  contactId: existingUser.contactId,
  formCode: existingUser.formCode,       // NOVO (necessário para redirect /aprovado)
  whatsappLink: whatsapp?.whatsappLink || null,
});
```

### 2. `app/(public)/page.tsx` — `handleExistingCPFSubmit`

Substituir lógica de redirecionamento:

```ts
if (data.exists) {
  if (data.temSenha) {
    router.push(`/login?cpf=${cpfLimpo}`);
  } else if (data.formCode) {
    router.push(`/aprovado?id=${data.formCode}`);
  } else {
    // fallback para candidatos muito antigos sem formCode
    router.push(`/suporte-whatsapp?link=${encodeURIComponent(data.whatsappLink ?? '')}`);
  }
}
```

### 3. `app/(public)/login/page.tsx`

Ler `?cpf=` dos searchParams e pré-preencher no estado inicial:

```ts
const cpfParam = params.get('cpf') ?? '';
const [cpf, setCpf] = useState(cpfParam ? formatarCPF(cpfParam) : '');
```

---

## Sem novas rotas, sem novos componentes

A feature reutiliza integralmente:
- `/login` já existente
- `/aprovado` já existente (tela de criar senha)
- `/api/check-cpf` já existente (apenas adicionar campos na resposta)
