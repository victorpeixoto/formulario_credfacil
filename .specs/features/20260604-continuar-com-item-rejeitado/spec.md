# Vídeo do veículo rejeitado não bloqueia "Continuar Análise" (WhatsApp) — Especificação

**Data:** 2026-06-04
**Status:** Aguardando aprovação
**ClickUp:** [86ahw4mfb](https://app.clickup.com/t/86ahw4mfb) (prioridade *high*, in progress)
**Branch sugerida:** `feature/video-veiculo-nao-bloqueia-whatsapp`
**Feature de origem:** `validacao-documentos-ia`

---

## Problema

Quando o **Vídeo do Veículo (ligado)** é rejeitado pela IA, ele aparece na tela de status como rejeitado e o status final do envio vai para `PENDENCIA`. Nesse estado, a tela de status mostra **apenas** o banner de "reenviar documento" e **esconde o botão "Continuar Análise → WhatsApp"** (`SecaoContato`), que hoje só aparece em `APROVADO`/`ANALISE_MANUAL`.

Resultado: o candidato com o vídeo do veículo rejeitado fica sem a opção de seguir o atendimento pelo WhatsApp, mesmo nos casos em que a equipe resolveria manualmente.

## Goals

- [ ] Não bloquear o botão "Continuar Análise" (WhatsApp) quando o vídeo do veículo está rejeitado.
- [ ] Manter a possibilidade de reenviar um novo vídeo dentro das especificações.

## Out of Scope

- Não alterar regras de aprovação/rejeição do pipeline (`determinar-status.ts` permanece).
- Não criar botão "Continuar mesmo assim" no wizard de envio.
- Não tratar outros documentos/fluxos (cards separados).

---

## User Stories

### P1: Continuar para o WhatsApp mesmo com vídeo do veículo rejeitado ⭐ MVP

**User Story**: Como candidato cujo vídeo do veículo foi rejeitado, quero continuar a análise pelo WhatsApp, para não ficar preso e poder resolver com a equipe — ou reenviar um novo vídeo se eu quiser.

**Why P1**: O bloqueio do botão de WhatsApp na pendência trava a continuidade do atendimento.

**Acceptance Criteria**:

1. WHEN o vídeo do veículo está com status `rejeitado` e aparece no status THEN a tela de status SHALL exibir o botão "Continuar Análise / Falar no WhatsApp" (`SecaoContato`).
2. WHEN esse botão é exibido por causa do vídeo do veículo rejeitado THEN o sistema SHALL buscar/preparar o link do WhatsApp (como já faz em `APROVADO`/`ANALISE_MANUAL`).
3. WHEN o candidato prefere reenviar THEN a tela SHALL continuar permitindo o reenvio do vídeo do veículo (card reenviável + instruções).
4. WHEN o botão de continuar é exibido em estado de pendência THEN o texto SHALL NÃO afirmar "documentos aprovados".
5. WHEN o vídeo do veículo NÃO está rejeitado THEN o comportamento atual da tela de status SHALL permanecer inalterado.

**Independent Test**: Forçar a rejeição do vídeo do veículo (status `PENDENCIA`), abrir a tela de status e confirmar que o botão "Falar no WhatsApp" aparece **e** que o card do vídeo continua reenviável.

---

## Edge Cases

- WHEN o link do WhatsApp ainda está carregando THEN a UI SHALL exibir o estado "Preparando contato..." (comportamento atual do `SecaoContato`).
- WHEN o vídeo do veículo é reenviado e aprovado THEN o fluxo normal de reenvio/atualização de status SHALL ocorrer.
- WHEN o status final é `ANALISE_MANUAL` ou `APROVADO` THEN o botão de WhatsApp SHALL continuar aparecendo como hoje.

---

## Success Criteria

- [ ] Botão "Continuar Análise / WhatsApp" aparece com o vídeo do veículo rejeitado.
- [ ] Reenvio do vídeo permanece disponível.
- [ ] Texto não afirma "aprovado" quando exibido em pendência.
- [ ] Nenhuma mudança no pipeline / `determinar-status.ts`.
