# Login do Cliente Existente — Specification

**Status**: 📋 Especificado — Aguardando design e tasks

---

## Contexto e Gap Identificado

Atualmente, quando um candidato já cadastrado clica em "Já sou cliente" e informa o CPF, o sistema o redireciona para o suporte via WhatsApp (`/suporte-whatsapp`). Com a entrega do Milestone 4 (Autenticação + Área Logada), esse fluxo se tornou inadequado: o candidato já possui conta (CPF + senha) e deve ser direcionado para login e, em seguida, para sua área de documentos.

**Situação atual:**
- `CardCPFExistente` → `/api/check-cpf` → se `exists: true` → `/suporte-whatsapp`
- Candidato com senha criada não consegue acessar sua área pelo fluxo natural

**Situação desejada:**
- `CardCPFExistente` → `/api/check-cpf` → se `exists: true` e tem senha → `/login` (com CPF pré-preenchido)
- Se `exists: true` mas **sem senha** → `/aprovado` (para criar senha, mesma tela de pós-formulário)
- Se `exists: false` → início do formulário (comportamento atual mantido)

---

## Problem Statement

Candidatos que já completaram o formulário e criaram senha não têm como acessar sua área logada pelo fluxo "Já sou cliente". O único caminho disponível é o WhatsApp, que é suporte humano — não o produto.

## Goals

- [ ] Candidato com conta criada clica "Já sou cliente" → é direcionado para login
- [ ] Candidato com CPF cadastrado mas sem senha → é direcionado para criar senha
- [ ] Fluxo WhatsApp mantido apenas para candidatos que precisam de suporte real
- [ ] CPF pré-preenchido na tela de login para reduzir fricção

## Out of Scope

- Mudança na lógica de validação de documentos
- Criação de nova página de login (já existe `/login`)
- Alteração no fluxo de candidatos novos (sem CPF cadastrado)

---

## User Stories

### P1: Redirecionamento para login ao clicar "Já sou cliente" ⭐ MVP

**User Story**: Como candidato que já completou o formulário e criou minha senha, quero que ao clicar "Já sou cliente" e informar meu CPF seja redirecionado diretamente para o login, sem passar pelo WhatsApp.

**Why P1**: Hoje o candidato não consegue acessar sua área por esse fluxo. É um gap crítico de UX.

**Acceptance Criteria**:

1. WHEN candidato informa CPF em "Já sou cliente" E CPF existe no MongoDB E `senhaHash` está presente THEN sistema SHALL redirecionar para `/login?cpf={cpf}` com CPF pré-preenchido
2. WHEN candidato informa CPF em "Já sou cliente" E CPF existe no MongoDB E `senhaHash` está **ausente** THEN sistema SHALL redirecionar para `/aprovado?id={formCode}` para criação de senha
3. WHEN candidato informa CPF em "Já sou cliente" E CPF **não existe** no MongoDB THEN sistema SHALL iniciar formulário normal (comportamento atual mantido)
4. WHEN candidato acessa `/login?cpf=12345678901` THEN sistema SHALL pré-preencher o campo CPF automaticamente
5. WHEN candidato faz login com sucesso pelo fluxo "Já sou cliente" THEN sistema SHALL redirecionar para `/documentos`

**Independent Test**: Usar CPF com senha cadastrada no fluxo "Já sou cliente" e verificar redirecionamento para `/login` com CPF preenchido.

---

### P2: Manter suporte WhatsApp para casos de suporte real

**User Story**: Como operador, quero que o suporte WhatsApp seja acionado apenas quando o candidato realmente precisa de ajuda humana, não como destino padrão para clientes existentes.

**Why P2**: O WhatsApp de suporte existe para exceções. Direcionar todos os clientes existentes para lá sobrecarrega os atendentes.

**Acceptance Criteria**:

1. WHEN candidato com conta criada (senhaHash presente) clica "Já sou cliente" THEN sistema SHALL **não** redirecionar para `/suporte-whatsapp`
2. WHEN candidato com CPF cadastrado mas sem senha clica "Já sou cliente" THEN sistema SHALL **não** redirecionar para `/suporte-whatsapp`
3. WHEN `/api/check-cpf` é chamado THEN sistema SHALL retornar campo `temSenha: boolean` além dos campos existentes

**Independent Test**: Verificar que `/api/check-cpf` retorna `temSenha: true/false` e que o frontend usa esse campo para decidir o redirecionamento.

---

## Alterações Necessárias

### Backend — `/api/check-cpf/route.ts`
- Adicionar campo `temSenha: boolean` na resposta quando `exists: true`
- Campo derivado de: `!!existingUser.senhaHash`

### Frontend — `handleExistingCPFSubmit` em `app/(public)/page.tsx`
- Substituir lógica de redirecionamento para `/suporte-whatsapp`
- Se `exists && temSenha` → `router.push('/login?cpf=' + cpfLimpo)`
- Se `exists && !temSenha` → `router.push('/aprovado?id=' + contactId)`
- Se `!exists` → manter comportamento atual (iniciar formulário)

### Frontend — `app/(public)/login/page.tsx`
- Ler `cpf` de `searchParams` e pré-preencher campo CPF no mount

---

## Edge Cases

- WHEN candidato digitou CPF com formatação (pontos/traço) THEN sistema SHALL normalizar antes de repassar como query param
- WHEN `formCode` está ausente no documento do MongoDB (candidatos muito antigos) THEN sistema SHALL redirecionar para `/suporte-whatsapp` como fallback
- WHEN candidato tenta acessar `/login?cpf=...` e já está autenticado THEN middleware SHALL redirecionar para `/documentos`

---

## Success Criteria

- [ ] Candidato com senha navega pelo fluxo "Já sou cliente" sem tocar o WhatsApp
- [ ] Campo CPF pré-preenchido na tela de login para esse fluxo
- [ ] Candidatos sem senha são direcionados para criação de senha (não WhatsApp)
- [ ] Fluxo de candidatos novos não é afetado
