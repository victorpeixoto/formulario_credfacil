# Edição de Cadastro no Portal — Specification

**Status**: ✅ Implementado — 2026-05-12 (aguardando verificação manual)

---

## Contexto e Gap Identificado

Após o candidato concluir o formulário público, criar senha e entrar na área logada (`/documentos` ou `/status`), ele **não tem como editar os dados cadastrais** (nome, e-mail, telefone, endereço) que informou durante a triagem. Se errou o endereço ou trocou de número, a única alternativa hoje é acionar o suporte humano via WhatsApp.

Esse atrito foi sinalizado pelo cliente do projeto como prioridade: o pedido inicial foi *"colocar uma seta de voltar do lado esquerdo no formulário"*, mas o gap real está **depois** do formulário, na área logada do portal. A `PROJECT.md` (v2, Milestone 5) já lista *"Área do candidato expandida (/perfil, histórico)"* — essa feature é a primeira fatia disso.

**Situação atual:**
- `GET /api/candidato` retorna apenas `nomeCompleto`, `cpf` (mascarado), `statusDocumentos`, `documentos` — não devolve endereço/telefone/email.
- Não existe endpoint `PATCH /api/candidato`.
- Não existe rota `(auth)/meus-dados`.
- Header de `(auth)/*` não tem navegação entre páginas.

**Situação desejada:**
- Candidato autenticado acessa `/meus-dados`, vê todos os dados cadastrais, edita e salva. CPF fica visível mascarado e bloqueado.
- Edição liberada enquanto o caso está nas fases em que ainda faz sentido corrigir dados (antes/durante a análise).
- Sincronização com a IA: alteração de endereço durante validação invalida a aprovação do comprovante de residência — comportamento documentado no design.

---

## Problem Statement

Candidatos logados precisam de um caminho self-service para corrigir dados cadastrais sem depender do suporte humano. Hoje qualquer erro de digitação obriga contato pelo WhatsApp, gerando atrito e fila no atendimento.

## Goals

- [ ] Candidato logado consegue editar `nomeCompleto`, `email`, `telefone` e endereço completo via `/meus-dados`
- [ ] CPF permanece somente leitura e mascarado em todas as telas
- [ ] Edição respeita janela de status: liberada para `AGUARDANDO_DOCUMENTOS`, `PROCESSANDO` e `PENDENCIA`; bloqueada para `APROVADO` e `ANALISE_MANUAL`
- [ ] Validação client e server idênticas (e-mail, nome com 2+ palavras, CEP 8 dígitos)
- [ ] Persistência confiável em `conversations` no MongoDB com `updatedAt` atualizado
- [ ] Painel interno (`painel-credfacil`) enxerga os dados atualizados sem mudança

## Out of Scope

- Edição das **respostas do funil de triagem** (`tipoAdmissao`, `tempoCLT`, `rendaLiquida`, `faturamento`, `tempoApp`, `aplicativos`, `aceite`, `referencias`). Decisão: imutáveis após submit. Se necessário, registra-se follow-up.
- Edição de CPF (identidade — só via suporte humano).
- Reset/troca de senha (já existe em `/redefinir-senha`).
- Histórico de alterações / log de auditoria (follow-up).
- Notificar analista quando cliente edita endereço durante validação (follow-up — ver `tasks.md`).
- Sincronização com a collection `credfacil_clt` do projeto `formulario_clt` (continua sendo snapshot da triagem).

---

## Non-Goals e premissas

- **Premissa**: a fonte da verdade pós-triagem é a collection `conversations`. `credfacil_clt` permanece como snapshot histórico e não recebe updates do portal.
- **Premissa**: documentos já enviados **não** são reprocessados automaticamente ao mudar endereço. A IA roda novamente apenas no próximo reenvio manual do comprovante de residência (decisão deliberada — re-rodar custa $ e tempo).
- **Não vamos**: criar página `/perfil` separada de `/meus-dados`. Por ora é a mesma coisa. Renomeia-se se a Área do Candidato crescer.

## User Stories

- **US-1** — Como candidato, quero corrigir o número do meu endereço sem precisar abrir o WhatsApp.
- **US-2** — Como candidato em status `PENDENCIA` (comprovante reprovado por endereço divergente), quero atualizar o endereço e reenviar o comprovante na sequência.
- **US-3** — Como candidato, quero ver meu CPF cadastrado para confirmar que estou na conta certa, sem conseguir editá-lo.
- **US-4** — Como analista (painel interno), quero ver o endereço atual e quando foi atualizado pela última vez.

## Janela de edição por status

| `statusDocumentos`        | Edita? | Razão                                                  |
|---------------------------|--------|--------------------------------------------------------|
| `AGUARDANDO_DOCUMENTOS`   | ✅     | Cliente ainda nem começou o upload — máxima liberdade   |
| `PROCESSANDO`             | ✅     | IA pode ainda não ter olhado o comprovante              |
| `PENDENCIA`               | ✅     | Geralmente cliente precisa corrigir endereço            |
| `APROVADO`                | ❌     | Caso fechado, mudança vira solicitação ao suporte       |
| `ANALISE_MANUAL`          | ❌     | Analista já tem o caso na mão                          |

> Nota terminológica: o usuário do projeto falou em "EM_VALIDACAO" — o enum real é `PROCESSANDO`. Mantém-se o nome do enum existente.

---

## Critérios de Aceite

- [ ] `GET /api/candidato` agora retorna também `email`, `telefone`, e todos os campos de endereço, sem expor `senhaHash`, `loginTentativas`, `loginBloqueadoAte`, `resetToken*`.
- [ ] `PATCH /api/candidato` aceita apenas a allowlist de campos, ignora silenciosamente o resto, valida e responde `{ success: true, candidato }` ou `{ error, campo? }` com status apropriado.
- [ ] Tentativa de `PATCH` sem `cf_token` → `401`.
- [ ] Tentativa de `PATCH` com `statusDocumentos` em `APROVADO`/`ANALISE_MANUAL` → `409` com mensagem clara.
- [ ] `/meus-dados` mostra CPF mascarado, campos preenchidos, validações inline, botão "Salvar" desabilitado sem mudança.
- [ ] Salvar com sucesso mostra toast/feedback e mantém usuário na página.
- [ ] Header de `(auth)/*` navega entre Documentos, Status e Meus dados, com ativo destacado.
- [ ] `updatedAt` da collection `conversations` muda após cada salvamento.
