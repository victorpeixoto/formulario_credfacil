# Edição de Cadastro no Portal — Tasks

**Design**: `.specs/features/edicao-cadastro-portal/design.md`
**Status**: ✅ Implementado — 2026-05-12 (verificação manual pendente)

> `npx tsc --noEmit` em `formulario-credfacil/` retorna exit 0 após T1–T9.

---

## T1 — `lib/cep.ts`: extrair `buscarCep` reutilizável ✅

**File**: `lib/cep.ts` (novo)

- Função pura `buscarCep(valor: string): Promise<ResultadoBuscaCep>` com retorno discriminado `{ ok: true; endereco } | { ok: false; erro }`.
- Sem side-effects; chamador controla loading/erro.
- Status: ✅ Done

---

## T2 — `CardDadosPessoais.tsx`: usar `lib/cep.ts` ✅

**File**: `components/cards/CardDadosPessoais.tsx`

- Removida a função local `buscarCep` e substituída por chamada a `buscarCepLib`.
- Tratamento de loading/erro mantido no componente.
- Status: ✅ Done

---

## T3 — `types/candidato.ts`: tipos compartilhados ✅

**File**: `types/candidato.ts` (novo)

- `CandidatoView`, `CandidatoPatchBody`, `EnderecoCandidato`, `DocumentoResumo`.
- Constantes `STATUS_EDICAO_LIBERADO` e `STATUS_EDICAO_BLOQUEADO`.
- Status: ✅ Done

---

## T4 — `lib/candidato.ts`: allowlist e sanitização ✅

**File**: `lib/candidato.ts` (novo)

- `sanitizarECriarUpdate(body)` retorna `{ campos, erro }` com:
  - Allowlist de 10 campos (tudo menos CPF).
  - Validação de `email`, `nomeCompleto`, `telefone`, `cep`, `estadoUF`.
  - Sanitização: `email.toLowerCase()`, telefone só dígitos, CEP só dígitos, UF em maiúsculas.
  - Rejeita strings vazias nos campos obrigatórios.
- Status: ✅ Done

---

## T5 — `/api/candidato` GET: expandir response ✅

**File**: `app/api/candidato/route.ts`

- Response agora inclui `email`, `telefone` e bloco `endereco` (cep, logradouro, numero, complemento, bairro, cidade, estadoUF).
- CPF continua mascarado.
- Permanece sem expor `senhaHash`, `loginTentativas`, `loginBloqueadoAte`, `resetToken*`.
- Consumidores existentes (`(auth)/documentos/page.tsx`, `(auth)/status/page.tsx`) continuam funcionando — só adicionamos campos.
- Status: ✅ Done

---

## T6 — `/api/candidato` PATCH: novo handler ✅

**File**: `app/api/candidato/route.ts`

- `PATCH` autenticado por `cf_token`.
- Usa `sanitizarECriarUpdate` da T4.
- Bloqueia quando `statusDocumentos ∈ {APROVADO, ANALISE_MANUAL}` → `409`.
- Update em `conversations` chaveado por `formCode`. Sempre seta `updatedAt`.
- Retorna o mesmo shape do GET com o documento atualizado.
- Status: ✅ Done

---

## T7 — `app/(auth)/layout.tsx`: layout com header ✅

**File**: `app/(auth)/layout.tsx`

- Renderiza `<NavHeader />` antes de `{children}`, dentro de `<div className="min-h-dvh bg-white flex flex-col">`.
- Sem regressão nas páginas existentes — elas já tinham `min-h-dvh` próprio mas o wrapper extra não atrapalha.
- Status: ✅ Done

---

## T8 — `components/portal/nav-header.tsx`: barra de navegação ✅

**File**: `components/portal/nav-header.tsx` (novo)

- 3 abas: Documentos, Status, Meus dados — ativo destacado via `usePathname()`.
- Mobile-first, sticky top, `max-w-md`.
- Botão "Sair" chama `POST /api/auth/logout` e redireciona para `/login`.
- **T8.1** — `app/api/auth/logout/route.ts` criado: limpa cookie `cf_token` com `maxAge: 0`.
- Status: ✅ Done

---

## T9 — `meus-dados` page + form ✅

**Files**:
- `app/(auth)/meus-dados/page.tsx` (novo)
- `components/meus-dados/form-cadastro.tsx` (novo)

- Page carrega via `GET /api/candidato`, exibe estado de loading/erro, calcula `bloqueado` e exibe banner amarelo quando `statusDocumentos === 'PENDENCIA'`.
- Form com 10 campos editáveis + CPF readOnly mascarado. Validações inline (nome, email, telefone, CEP). `isDirty` desabilita botão. ViaCEP com auto-preenchimento ao completar 8 dígitos.
- `PATCH` no submit, toast inline (sucesso/erro), atualiza estado base via `onSalvo`.
- Status: ✅ Done

---

## T10 — Verificação manual (pendente)

`tsc --noEmit` passou sem erros. Os passos abaixo dependem de um ambiente com Mongo e candidato de teste:

- [ ] Logar com CPF de teste em `AGUARDANDO_DOCUMENTOS`, editar nome + endereço, salvar. Confirmar no Mongo Compass o `updatedAt`.
- [ ] Repetir com `PROCESSANDO` e `PENDENCIA` — deve permitir.
- [ ] Forçar `APROVADO`/`ANALISE_MANUAL` no banco → `PATCH` retorna `409` e UI mostra mensagem.
- [ ] `curl -X PATCH /api/candidato` sem cookie → `401`.
- [ ] `curl -X PATCH /api/candidato` com `{"cpf":"00000000000","email":"a@b.com"}` → CPF ignorado, e-mail atualizado.
- [ ] `painel-credfacil/documentos/[formCode]` mostra endereço atualizado.
- [ ] Fluxo público de CEP em `formulario-credfacil/app/(public)/page.tsx` continua funcionando (verifica T2 sem regressão).

---

## Follow-ups (não implementados — registrar como issues)

- **FU-1** — Auditoria: collection `audit_log` gravando histórico de alterações por usuário.
- **FU-2** — Invalidar `documentos.comprovante` ao alterar `cep`/`logradouro`/`numero` (decisão de produto).
- **FU-3** — Notificar analista (Telegram) quando cliente edita endereço durante `PROCESSANDO`.
- **FU-4** — Permitir edição das respostas do funil de triagem (`tipoAdmissao`, `faturamento`, etc.) — exige decisão sobre re-avaliação.
- **FU-5** — Rate limit no `PATCH /api/candidato`.
- **FU-6** — `painel-credfacil`: exibir "última alteração pelo cliente em DD/MM HH:MM".
- **FU-7** — Sincronização opcional `conversations` → `credfacil_clt` (ou deprecação da `credfacil_clt`).
