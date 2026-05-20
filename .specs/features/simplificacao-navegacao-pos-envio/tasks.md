# Simplificação da Navegação Pós-Envio — Tasks

**Spec:** [spec.md](./spec.md) | **Design:** [design.md](./design.md)

---

## Investigação preliminar

- [x] **T1.** Localizar onde `GET /api/candidato` lê os dados — confirmado em `app/api/candidato/route.ts`. Não havia helper reutilizável; criado em T4.
- [x] **T2.** Confirmar o tipo `StatusDocumentos` em `types/documentos.ts` — valores reais: `AGUARDANDO_DOCUMENTOS`, `PROCESSANDO`, `APROVADO`, `PENDENCIA`, `ANALISE_MANUAL`. `REPROVADO` mencionado na spec não existe no código nem no banco.
- [x] **T3.** Middleware (`middleware.ts`) protege `(auth)/*` e redireciona para `/login?redirect=<path>` quando não há sessão válida. O helper também faz `redirect('/login')` como defesa extra.

## Extração do helper

- [x] **T4.** Criado `lib/auth/get-candidato-atual.ts` exportando `getCandidatoAtual()` — lê cookie `cf_token`, verifica JWT, busca `{ nomeCompleto, cpf, statusDocumentos }` do banco com projeção mínima. Redireciona para `/login` se sessão inválida ou candidato não encontrado.
- [ ] **T5.** `app/api/candidato/route.ts` não foi refatorado para usar o helper — a lógica local `autenticar()` foi mantida pois o route handler retorna shape diferente (dados completos com documentos, endereço, etc.). O helper serve exclusivamente para server components. Não é necessário refatorar.

## Layout server-side

- [x] **T6.** `app/(auth)/layout.tsx` convertido em Server Component async. Chama `getCandidatoAtual()` e passa `statusDocumentos` como prop para `NavHeader`.
- [x] **T7.** Sessão inválida → `getCandidatoAtual()` faz `redirect('/login')` (defesa extra além do middleware).
- [x] **T8.** `export const dynamic = 'force-dynamic'` adicionado ao layout — garante re-fetch do status a cada navegação server-side.

## NavHeader

- [x] **T9.** Adicionada prop `statusDocumentos: StatusDocumentos` à interface de `NavHeader`.
- [x] **T10.** Array `ABAS` fixo substituído por lógica condicional: `/documentos` incluída apenas quando `statusDocumentos === 'AGUARDANDO_DOCUMENTOS'`.
- [x] **T11.** `NavHeader` continua `'use client'` — recebe prop do server component pai.

## Revalidação

- [x] **T12.** `POST /api/validacao/iniciar` já atualizava `statusDocumentos: 'PROCESSANDO'` no banco antes de responder. O problema era que `router.push('/status')` usava soft navigation (Router Cache do Next.js), não re-executando o layout server component. **Solução:** adicionar `router.refresh()` antes de `router.push('/status')` em `app/(auth)/documentos/page.tsx` — invalida o Router Cache e força o layout a re-ler o status atualizado do banco. `revalidatePath` não foi necessário.

## Validação manual

- [ ] **T13.** Criar/usar um candidato de teste em `AGUARDANDO_DOCUMENTOS`. Confirmar que vê todas as 3 abas e o wizard funciona.
- [ ] **T14.** Enviar todos os documentos e iniciar análise. Confirmar que após o redirect para `/status`, a aba "Documentos" não aparece mais.
- [ ] **T15.** Tentar acessar `/documentos` por URL direta com candidato em `PROCESSANDO` — deve redirecionar para `/status`.
- [ ] **T16.** Repetir para cada status: `APROVADO`, `PENDENCIA`, `ANALISE_MANUAL`. Em todos, aba "Documentos" ausente.
- [ ] **T17.** Verificar que o reenvio de documento dentro de `/status` continua funcionando (`reenvio-documento.tsx`).
- [ ] **T18.** Inspecionar HTML inicial (View Source) para confirmar que não há flash — a aba não deve estar no markup quando o status não for `AGUARDANDO_DOCUMENTOS`.

## Documentação e fechamento

- [ ] **T19.** Atualizar `STATE.md` registrando as mudanças desta feature.
- [ ] **T20.** Marcar status da spec como ✅ Implementado com a data.
