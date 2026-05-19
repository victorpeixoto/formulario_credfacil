# Simplificação da Navegação Pós-Envio de Documentos — Specification

**Status**: 📋 Especificado — 2026-05-19

---

## Contexto e Gap Identificado

A área logada do portal (`(auth)/*`) hoje expõe 3 abas fixas no `NavHeader`: **Documentos**, **Status**, **Meus dados**. A aba **Documentos** (`/documentos`) é o wizard de **primeiro envio** — um passo a passo guiado com 5 capturas obrigatórias, barra de progresso e botão "Enviar para análise" no final.

Esse wizard só faz sentido enquanto `statusDocumentos === 'AGUARDANDO_DOCUMENTOS'`. Após o envio, o próprio `page.tsx` faz `router.replace('/status')` se detectar status diferente, ou seja, a aba **já é tecnicamente inútil** uma vez que os documentos foram enviados. Mesmo assim, ela continua visível no header e clicável, o que pode confundir o candidato em duas situações:

1. Após enviar tudo, ele vê três abas — pode clicar em "Documentos" esperando algo (reenviar, ver o que mandou) e ser redirecionado de volta para "Status" abruptamente.
2. Quando o candidato precisa **reenviar** um documento (rejeitado pela IA ou em pendência), o caminho correto é `/status` (que já oferece o fluxo de reenvio via `components/portal/reenvio-documento.tsx`), mas a aba "Documentos" sugere visualmente que ela seria o lugar certo.

O cliente do projeto reportou em 2026-05-19 que a aba "Documentos" só é útil no envio inicial; depois disso ela atrapalha mais do que ajuda.

**Situação atual:**
- `components/portal/nav-header.tsx` lista as 3 abas hardcoded para todo candidato em `(auth)/*`.
- `app/(auth)/documentos/page.tsx` já tem lógica de redirect quando o status não é `AGUARDANDO_DOCUMENTOS`.
- A rota `/documentos` continua acessível por URL direta após o envio (redireciona, mas existe).

**Situação desejada:**
- Enquanto `statusDocumentos === 'AGUARDANDO_DOCUMENTOS'`: candidato vê apenas o wizard de envio. Pode ser sem header de abas, ou com abas reduzidas, conforme decidido no design.
- Após enviar (qualquer outro status): aba "Documentos" some do `NavHeader`. Restam apenas "Status" e "Meus dados".
- Reenvios continuam acontecendo dentro de "Status", sem mudança de fluxo lá.
- URL direta `/documentos` continua redirecionando para `/status` (comportamento atual mantido).

---

## Problem Statement

A aba "Documentos" no header da área logada é útil apenas no envio inicial. Após o envio, ela vira ruído de navegação e desorienta o candidato — sugerindo que reenvios acontecem ali, quando na verdade devem ser feitos em "Status". Precisamos esconder a aba quando ela não tem mais função.

## Goals

- [ ] Aba "Documentos" some do `NavHeader` quando `statusDocumentos !== 'AGUARDANDO_DOCUMENTOS'`
- [ ] Durante o envio inicial (`AGUARDANDO_DOCUMENTOS`), o candidato continua tendo acesso ao wizard sem confusão de navegação
- [ ] Reenvios continuam funcionando em `/status` sem alteração de fluxo
- [ ] Rota `/documentos` mantém o redirect server-aware se acessada por URL direta após o envio
- [ ] Nenhuma regressão em `/status` ou `/meus-dados`

## Out of Scope

- Reescrever o componente `reenvio-documento.tsx`.
- Mudar o design visual das abas restantes.
- Implementar histórico de envios ou área de "documentos enviados" como visualização — pode entrar em outra feature, mas não aqui.
- Mudanças na navegação do formulário público (`/cadastro`, etc).

## Decisões em aberto (a tratar no design.md)

1. **Como o `NavHeader` descobre o `statusDocumentos`?** Opções: (a) o `layout.tsx` busca no servidor e passa via context/props; (b) o header faz `fetch('/api/candidato')` no client-side; (c) usar SWR/React Query compartilhado entre páginas. A opção (a) é mais limpa porque evita flash da aba aparecendo e sumindo.
2. **Durante `AGUARDANDO_DOCUMENTOS`, mostrar o header com abas?** O wizard tem barra de progresso própria. Talvez seja melhor esconder o header inteiro durante o envio inicial para reduzir distração. Decidir no design.
3. **Comportamento se o candidato tem múltiplos status em transição (ex.: `PROCESSANDO`)?** Provavelmente já cai na regra geral "esconder aba" pois não é mais `AGUARDANDO_DOCUMENTOS`.

## Critérios de Aceite

1. Candidato com `statusDocumentos === 'AGUARDANDO_DOCUMENTOS'` acessa `/documentos` e vê o wizard normalmente. Aba "Documentos" visível ou header escondido conforme decisão de design — mas o fluxo de envio inicial funciona.
2. Candidato com qualquer outro `statusDocumentos` (`PROCESSANDO`, `APROVADO`, `PENDENCIA`, `ANALISE_MANUAL`, `REPROVADO`) **não vê** a aba "Documentos" no header em nenhuma página da área logada.
3. URL direta `/documentos` para candidato fora de `AGUARDANDO_DOCUMENTOS` redireciona para `/status` (comportamento atual preservado).
4. Reenvio de documento individual (fluxo de `reenvio-documento.tsx` em `/status`) continua idêntico.
5. Aba "Status" e "Meus dados" continuam funcionando para todos os status.
6. Nenhum flash de aba aparecendo/sumindo entre o render inicial e a hidratação client-side.

## Stakeholders

- **Solicitante:** cliente do projeto (feedback em 2026-05-19).
- **Implementação:** time de frontend formulario-credfacil.
- **Validação:** QA manual cobrindo cada estado de `statusDocumentos`.