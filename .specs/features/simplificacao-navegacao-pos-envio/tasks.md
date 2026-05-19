# Simplificação da Navegação Pós-Envio — Tasks

**Spec:** [spec.md](./spec.md) | **Design:** [design.md](./design.md)

---

## Investigação preliminar

- [ ] **T1.** Localizar onde `GET /api/candidato` lê os dados (provável: `app/api/candidato/route.ts` + algum helper em `lib/`). Confirmar se já existe um helper server-side reutilizável.
- [ ] **T2.** Confirmar o tipo `StatusDocumentos` em `types/` (valores possíveis: `AGUARDANDO_DOCUMENTOS`, `PROCESSANDO`, `APROVADO`, `PENDENCIA`, `ANALISE_MANUAL`, `REPROVADO`). Ajustar a spec/design se houver divergência.
- [ ] **T3.** Verificar como o middleware (`middleware.ts`) protege `(auth)/*` — entender se redireciona para `/login` quando não há sessão.

## Extração do helper

- [ ] **T4.** Se ainda não existir, criar `lib/auth/get-candidato-atual.ts` exportando `getCandidatoAtual()` que retorna `{ nomeCompleto, cpf, statusDocumentos, ... }` lendo cookie de sessão + banco.
- [ ] **T5.** Refatorar `app/api/candidato/route.ts` para chamar `getCandidatoAtual()` em vez de duplicar a lógica. Garantir que a resposta JSON segue idêntica.

## Layout server-side

- [ ] **T6.** Converter `app/(auth)/layout.tsx` em Server Component async. Chamar `getCandidatoAtual()` e passar `statusDocumentos` como prop para `NavHeader`.
- [ ] **T7.** Se a sessão for inválida e o middleware não pegar, redirecionar para `/login` no próprio layout (defesa extra).
- [ ] **T8.** Considerar `export const dynamic = 'force-dynamic'` no layout para garantir que mudanças de status refletem sem cache stale. Validar com o time se o projeto usa essa estratégia em outras rotas.

## NavHeader

- [ ] **T9.** Adicionar prop `statusDocumentos: StatusDocumentos` à interface de `NavHeader`.
- [ ] **T10.** Substituir o array `ABAS` fixo pela lógica condicional: incluir `/documentos` só quando `statusDocumentos === 'AGUARDANDO_DOCUMENTOS'`.
- [ ] **T11.** Garantir que o `NavHeader` continua sendo client component (`'use client'`) — apenas passa a receber prop.

## Revalidação (se aplicável)

- [ ] **T12.** Identificar a mutation que muda o status de `AGUARDANDO_DOCUMENTOS` para `PROCESSANDO` (provável: `POST /api/validacao/iniciar`). Adicionar `revalidatePath('/status')` e `revalidatePath('/documentos')` no fim do handler, se o layout não estiver em `force-dynamic`.

## Validação manual

- [ ] **T13.** Criar/usar um candidato de teste em `AGUARDANDO_DOCUMENTOS`. Confirmar que vê todas as 3 abas e o wizard funciona.
- [ ] **T14.** Mover esse candidato para `PROCESSANDO` (enviar tudo e iniciar análise). Confirmar que após o redirect para `/status`, a aba "Documentos" não aparece mais.
- [ ] **T15.** Tentar acessar `/documentos` por URL direta com candidato em `PROCESSANDO` — deve redirecionar para `/status` (comportamento atual mantido).
- [ ] **T16.** Repetir o teste para cada status: `APROVADO`, `PENDENCIA`, `ANALISE_MANUAL`, `REPROVADO`. Em todos, aba "Documentos" ausente.
- [ ] **T17.** Verificar que o reenvio de documento dentro de `/status` continua funcionando (`reenvio-documento.tsx`).
- [ ] **T18.** Inspecionar HTML inicial (View Source) para confirmar que não há flash — a aba não deve estar no markup quando o status não for `AGUARDANDO_DOCUMENTOS`.

## Documentação e fechamento

- [ ] **T19.** Atualizar `STATE.md` registrando: "NavHeader passa a esconder a aba Documentos quando candidato sai de AGUARDANDO_DOCUMENTOS. Layout `(auth)` agora é server component."
- [ ] **T20.** Marcar status da spec como ✅ Implementado com a data.
