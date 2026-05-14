# Edição de Cadastro no Portal — Design

**Spec**: `.specs/features/edicao-cadastro-portal/spec.md`
**Status**: ✅ Implementado — 2026-05-12

---

## Visão geral

Adiciona uma rota autenticada `/meus-dados` ao portal, com formulário de edição de dados cadastrais. A persistência usa o documento existente em `conversations` (MongoDB). Reutiliza componentes e validações que já existem no projeto.

Estrutura de pastas afetada:

```
formulario-credfacil/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx              ← NOVO (header de navegação)
│   │   ├── documentos/page.tsx     ← (existente, sem alteração)
│   │   ├── status/page.tsx         ← (existente, sem alteração)
│   │   └── meus-dados/page.tsx     ← NOVO
│   └── api/
│       └── candidato/route.ts      ← ALTERAR (expandir GET + novo PATCH)
├── components/
│   ├── portal/
│   │   └── nav-header.tsx          ← NOVO
│   └── meus-dados/
│       └── form-cadastro.tsx       ← NOVO
├── lib/
│   ├── cep.ts                      ← NOVO (extrair de CardDadosPessoais)
│   └── candidato.ts                ← NOVO (allowlist + sanitização)
└── types/
    └── candidato.ts                ← NOVO
```

---

## Fluxo de dados

```
[Candidato logado]
       │
       │  GET /meus-dados (página)
       ▼
[meus-dados/page.tsx]
       │
       │  fetch GET /api/candidato
       ▼
[/api/candidato GET]
       │  verificarJWT(cf_token) → { cpf, formCode }
       │  find conversations({ formCode })
       │  retorna shape expandido (incluindo endereço/email/telefone)
       ▼
[form-cadastro.tsx]
       │  usuário edita e clica "Salvar"
       │
       │  fetch PATCH /api/candidato {campos}
       ▼
[/api/candidato PATCH]
       │  verificarJWT(cf_token)
       │  carregar conversations({ formCode })
       │  bloquear se statusDocumentos ∈ {APROVADO, ANALISE_MANUAL}
       │  sanitizarCampos(body) → allowlist
       │  validar (email, nome, cep…)
       │  updateOne({ cpf }, { $set: {...campos, updatedAt} })
       │  retornar GET shape atualizado
       ▼
[Toast "Dados salvos" + estado local atualizado]
```

---

## Alterações por Arquivo

### 1. `app/api/candidato/route.ts` — expandir GET + adicionar PATCH

#### 1.1 — Expandir GET

Adicionar ao response (sem remover nada do que já existe):

```ts
return NextResponse.json({
  nomeCompleto: candidato.nomeCompleto ?? '',
  cpf: mascararCPF(candidato.cpf ?? ''),
  email: candidato.email ?? '',                    // NOVO
  telefone: candidato.telefone ?? '',              // NOVO
  endereco: {                                      // NOVO
    cep: candidato.cep ?? '',
    logradouro: candidato.logradouro ?? '',
    numero: candidato.numero ?? '',
    complemento: candidato.complemento ?? '',
    bairro: candidato.bairro ?? '',
    cidade: candidato.cidade ?? '',
    estadoUF: candidato.estadoUF ?? '',
  },
  statusDocumentos: (candidato.statusDocumentos as StatusDocumentos) ?? 'AGUARDANDO_DOCUMENTOS',
  documentos,
});
```

**Não expor**: `senhaHash`, `loginTentativas`, `loginBloqueadoAte`, `resetToken`, `resetTokenExpira`, `cpf` em claro.

#### 1.2 — Adicionar PATCH

```ts
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('cf_token')?.value;
  const payload = token ? verificarJWT(token) : null;
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { campos, erro } = sanitizarECriarUpdate(body); // ver lib/candidato.ts
  if (erro) return NextResponse.json({ error: erro.mensagem, campo: erro.campo }, { status: 400 });
  if (Object.keys(campos).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('credfacil');
  const col = db.collection('conversations');

  const atual = await col.findOne({ formCode: payload.formCode }, { projection: { statusDocumentos: 1 } });
  if (!atual) return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });

  const STATUS_BLOQUEADOS: StatusDocumentos[] = ['APROVADO', 'ANALISE_MANUAL'];
  if (STATUS_BLOQUEADOS.includes(atual.statusDocumentos)) {
    return NextResponse.json(
      { error: 'Caso já em fase final. Para alterar, fale com o suporte.' },
      { status: 409 }
    );
  }

  await col.updateOne(
    { formCode: payload.formCode },
    { $set: { ...campos, updatedAt: new Date() } }
  );

  // devolver o shape do GET atualizado
  return GET();
}
```

> `GET()` é a função GET exportada — pode chamar diretamente reaproveitando a lógica.

### 2. `lib/candidato.ts` — allowlist e sanitização

```ts
const CAMPOS_PERMITIDOS = [
  'nomeCompleto', 'email', 'telefone',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estadoUF',
] as const;

export function sanitizarECriarUpdate(body: unknown) {
  if (!body || typeof body !== 'object') {
    return { campos: {}, erro: { mensagem: 'Body inválido', campo: null } };
  }
  const campos: Record<string, string> = {};
  for (const k of CAMPOS_PERMITIDOS) {
    const v = (body as Record<string, unknown>)[k];
    if (v === undefined) continue;
    if (typeof v !== 'string') {
      return { campos: {}, erro: { mensagem: `Campo ${k} deve ser string`, campo: k } };
    }
    campos[k] = v.trim();
  }

  // validações
  if (campos.email && !validarEmail(campos.email)) return erro('email', 'E-mail inválido');
  if (campos.nomeCompleto && !validarNomeCompleto(campos.nomeCompleto)) return erro('nomeCompleto', 'Informe nome e sobrenome');
  if (campos.cep) {
    campos.cep = campos.cep.replace(/\D/g, '');
    if (campos.cep.length !== 8) return erro('cep', 'CEP deve ter 8 dígitos');
  }
  if (campos.telefone) campos.telefone = campos.telefone.replace(/\D/g, '');
  if (campos.email) campos.email = campos.email.toLowerCase();

  return { campos, erro: null };
}
```

> Reusa `validarEmail` e `validarNomeCompleto` do `lib/validators.ts` que já existe.

### 3. `lib/cep.ts` — extrair de `CardDadosPessoais`

Hoje a função `buscarCep` está dentro do componente `components/cards/CardDadosPessoais.tsx:37`. Mover para `lib/cep.ts` e o componente passa a importar. Assinatura sugerida:

```ts
export interface EnderecoViaCep {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estadoUF: string;
  encontrado: boolean;
}

export async function buscarCep(cep: string): Promise<EnderecoViaCep | { erro: string }> {
  const nums = cep.replace(/\D/g, '');
  if (nums.length !== 8) return { erro: 'CEP incompleto' };
  const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
  const data = await res.json();
  if (data.erro) return { erro: 'CEP não encontrado' };
  return {
    cep: nums,
    logradouro: data.logradouro || '',
    bairro: data.bairro || '',
    cidade: data.localidade || '',
    estadoUF: data.uf || '',
    encontrado: !!data.logradouro,
  };
}
```

`CardDadosPessoais.tsx` passa a importar `buscarCep` daqui. Mantém o efeito colateral (estado de loading, erro) no chamador.

### 4. `app/(auth)/layout.tsx` — layout com header

Atualmente cada página em `(auth)` renderiza seu próprio chrome. Criar um layout compartilhado:

```tsx
import NavHeader from '@/components/portal/nav-header';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavHeader />
      {children}
    </>
  );
}
```

> Verificar antes se já existe `app/(auth)/layout.tsx` (provavelmente não). Caso exista, adicionar o header sem quebrar o que já está.

### 5. `components/portal/nav-header.tsx` — barra de navegação

3 abas: **Documentos** (`/documentos`), **Status** (`/status`), **Meus dados** (`/meus-dados`). Marca ativo pelo `usePathname()`. Mobile-first (igual ao resto do app). Inclui botão "Sair" que chama `POST /api/auth/logout` (verificar se existe — se não, adicionar como subtarefa).

### 6. `app/(auth)/meus-dados/page.tsx` + `components/meus-dados/form-cadastro.tsx`

`page.tsx`:
- Server-side: lê o cookie e faz prefetch? Não — manter client-side pra consistência com `/documentos`.
- Faz `useEffect` → `fetch('/api/candidato')` → passa pro `<FormCadastro initialData={...} />`.

`form-cadastro.tsx`:
- Estado local com cópia dos dados iniciais.
- `isDirty` = comparação shallow. Botão Salvar desabilitado se `!isDirty || temErro || salvando`.
- Campo CPF: `<input readOnly value={cpf} />` com `bg-gray-50` e ícone de cadeado.
- Bloco endereço: input CEP com onChange chamando `buscarCep` (debounce 300ms) e auto-preenchendo logradouro/bairro/cidade/estadoUF.
- Erros inline por campo (igual ao `CardDadosPessoais`).
- `onSubmit` → `PATCH /api/candidato` → ao sucesso atualiza estado base e mostra toast.
- Banner no topo: se `statusDocumentos === 'PENDENCIA'`, mostrar "Após corrigir, reenvie o documento que estava pendente em [Documentos]."

### 7. `types/candidato.ts`

```ts
import type { StatusDocumentos } from './documentos';

export interface CandidatoView {
  nomeCompleto: string;
  cpf: string;        // mascarado
  email: string;
  telefone: string;
  endereco: {
    cep: string; logradouro: string; numero: string; complemento: string;
    bairro: string; cidade: string; estadoUF: string;
  };
  statusDocumentos: StatusDocumentos;
  documentos: Record<string, { status: string; motivo: string | null; tentativas: number }>;
}

export type CandidatoPatchBody = Partial<{
  nomeCompleto: string; email: string; telefone: string;
  cep: string; logradouro: string; numero: string; complemento: string;
  bairro: string; cidade: string; estadoUF: string;
}>;
```

---

## Considerações de segurança

- **Allowlist server-side** é obrigatória. Nunca confiar no client.
- `cpf` jamais aceito no body — se vier, ignorar (allowlist garante).
- `formCode` é o handle de identidade no token; queries usam `formCode`, não o `cpf` que pode estar mascarado em alguns lugares.
- **Rate limit** (follow-up): adicionar contador parecido com `loginTentativas` para PATCH? Por ora não — risco baixo, requisição autenticada.
- **CSRF**: cookies `sameSite: 'lax'` + JWT — herdamos a postura atual. Sem mudança.

---

## Considerações de UX

- Sem confirmação modal — botão "Salvar" basta. Edição é reversível e o feedback é imediato.
- Em status `PENDENCIA`, mostrar banner amarelo com call-to-action para reenviar documento após editar.
- Se a IA já tinha aprovado o comprovante de residência e o endereço mudou, **não invalidamos automaticamente**. O analista verá `updatedAt` posterior à aprovação e julga.
  - Follow-up: invalidar `documentos.comprovante` ao mudar `cep`/`logradouro`/`numero` (decisão de produto).
