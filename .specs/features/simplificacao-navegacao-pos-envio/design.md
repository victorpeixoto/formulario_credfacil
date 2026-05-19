# Simplificação da Navegação Pós-Envio — Design

**Status**: 📋 Proposto — 2026-05-19
**Spec relacionada:** [spec.md](./spec.md)

---

## Estratégia geral

O `NavHeader` deve receber o `statusDocumentos` por **server props**, vindas do `layout.tsx` da rota `(auth)`. Isso elimina o flash que aconteceria se a decisão fosse feita no client após um fetch, e centraliza a fonte da verdade em um único lugar.

A página `/documentos` continua existindo e mantém seu redirect atual no client. Esse redirect é defesa em profundidade, não a primeira linha — a primeira linha agora é a aba simplesmente não aparecer.

## Decisões técnicas

### 1. Server-side fetch do status no `(auth)/layout.tsx`

Converter o `(auth)/layout.tsx` em Server Component que:
- Lê o cookie de sessão (mesmo mecanismo que `/api/candidato` usa).
- Faz uma chamada direta a uma função utilitária (ou ao banco) para pegar `statusDocumentos`.
- Passa esse valor para o `NavHeader` como prop.
- Se a sessão for inválida, redireciona para `/login` (provavelmente o middleware já faz isso — confirmar).

```tsx
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const candidato = await getCandidatoAtual(); // helper server-side
  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <NavHeader statusDocumentos={candidato.statusDocumentos} />
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
}
```

### 2. `NavHeader` recebe `statusDocumentos`

Converter o componente em algo que continua sendo client (precisa de `usePathname`, `useRouter` para o botão "Sair"), mas que recebe o status como prop:

```tsx
interface NavHeaderProps {
  statusDocumentos: StatusDocumentos;
}

export default function NavHeader({ statusDocumentos }: NavHeaderProps) {
  const ABAS_BASE = [
    { href: '/status', label: 'Status' },
    { href: '/meus-dados', label: 'Meus dados' },
  ];
  const abas =
    statusDocumentos === 'AGUARDANDO_DOCUMENTOS'
      ? [{ href: '/documentos', label: 'Documentos' }, ...ABAS_BASE]
      : ABAS_BASE;
  // resto igual
}
```

Decisão lateral: enquanto `AGUARDANDO_DOCUMENTOS`, **manter** a aba Documentos no header (não esconder o header inteiro). Razões:
- O candidato pode querer ver/voltar para "Meus dados" durante o envio (ex.: corrigir nome antes de submeter).
- O wizard já tem barra de progresso própria, mas isso não conflita com o header de abas — o `passo-wizard.tsx` ocupa só o `main`, o `NavHeader` vive acima.
- Esconder o header inteiro complicaria a hierarquia do layout e impediria o botão "Sair".

### 3. Helper `getCandidatoAtual` server-side

Se ainda não existir, criar `lib/auth/get-candidato-atual.ts` que reusa a mesma lógica da rota `GET /api/candidato`. Provavelmente já existe — verificar em `lib/auth/*` ou `lib/candidato/*`. Reutilizar para evitar divergência.

Se o handler `GET /api/candidato` for a única fonte hoje, extrair sua lógica de leitura do banco para um helper compartilhado e usar tanto no route handler quanto no layout.

### 4. Tipagem

`StatusDocumentos` provavelmente já existe em `types/`. Importar e tipar a prop. Não inventar novo enum.

### 5. Manter o redirect client em `/documentos/page.tsx`

Não remover. Defesa em profundidade contra:
- Estado defasado entre o render server e mudança real (ex.: aprovação ocorreu enquanto a página estava aberta).
- Acessos por URL direta com status já mudado.

## Alternativas consideradas

1. **Fetch client-side no `NavHeader`:** rejeitado pelo flash (aba aparece e some).
2. **Esconder o header inteiro durante `AGUARDANDO_DOCUMENTOS`:** rejeitado conforme §2 acima.
3. **Hardcoded por rota (esconder a aba se `pathname !== '/documentos'`):** rejeitado — quebra quando o candidato termina o envio e permanece em `/documentos` por um instante antes do redirect.
4. **Server Action para invalidar aba:** overkill para o problema.

## Riscos e mitigação

- **Custo extra de query no layout:** uma leitura por navegação na área logada. Aceitável; é a mesma leitura que o `NavHeader` faria via fetch.
- **Layout converter para Server Component:** confirmar que nenhum componente filho importado direto no layout precisa de client. O `NavHeader` é importado mas é client — ok, server pode renderizar client component como filho.
- **Cache do Next:** se o layout for cacheado agressivamente, a mudança de status (envio bem-sucedido) pode não refletir imediatamente. Mitigar com `revalidatePath('/status')` e `revalidatePath('/documentos')` nas mutations que mudam o status, ou usar `dynamic = 'force-dynamic'` no layout. Decidir conforme a estratégia atual do projeto (verificar se outras rotas autenticadas usam revalidate).

## Arquivos afetados

- `formulario-credfacil/app/(auth)/layout.tsx` (modificado — vira server component que busca status).
- `formulario-credfacil/components/portal/nav-header.tsx` (modificado — recebe prop, filtra abas).
- `formulario-credfacil/lib/auth/get-candidato-atual.ts` (novo OU extraído da lógica existente).
- `formulario-credfacil/app/api/candidato/route.ts` (refatorado para usar o helper, sem mudança de comportamento).
