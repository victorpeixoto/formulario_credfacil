# Remover validação de placa no vídeo do veículo — Especificação

**Data:** 2026-06-04
**Status:** Aguardando aprovação
**ClickUp:** [86ahw4mc7](https://app.clickup.com/t/86ahw4mc7) (prioridade *high*, in progress)
**Branch sugerida:** `feature/remover-placa-video-veiculo`
**Feature de origem:** `validacao-documentos-ia`

---

## Problema

A validação da placa no **vídeo do veículo** gera reprovações indevidas (ângulo, reflexo, placa parcialmente visível) sem agregar valor. Hoje o cruzamento de placa usa **3 fontes** (selfie, vídeo do app, vídeo do veículo) e rejeita as três quando divergem. A placa do **vídeo do veículo** é a mais frágil e deve sair do cruzamento: a conferência deve ocorrer **somente entre a selfie e o vídeo do app**.

## Goals

- [ ] Restringir o cruzamento de placa a **selfie × vídeo do app**.
- [ ] Remover o vídeo do veículo como fonte e como alvo de rejeição por placa.
- [ ] Manter intactas as demais regras do vídeo do veículo (veículo ligado, sem cortes).

## Out of Scope

- Não alterar a validação de placa na **selfie** (`selfie-placa.ts`) nem a extração de placa do **vídeo do app** — continuam sendo as fontes do cruzamento.
- Não mexer em biometria, faturamento do vídeo do app ou identidade.

---

## User Stories

### P1: Vídeo do veículo aprovado sem depender da placa ⭐ MVP

**User Story**: Como candidato, quero que o vídeo do meu veículo seja aprovado mesmo que a placa não esteja perfeitamente legível no vídeo, já que mostro a placa na selfie.

**Why P1**: Reprovações indevidas por placa no vídeo, redundante com a selfie.

**Acceptance Criteria**:

1. WHEN o cruzamento de placa é avaliado THEN o sistema SHALL comparar **apenas** a placa da **selfie** e a placa do **vídeo do app**.
2. WHEN as placas da selfie e do vídeo do app divergem THEN o sistema SHALL rejeitar **apenas** a selfie e o vídeo do app (NÃO o vídeo do veículo).
3. WHEN o vídeo do veículo é analisado THEN o sistema SHALL NÃO reprovar com base na placa (nem por extração isolada, nem por cruzamento).
4. WHEN o vídeo do veículo aparenta estar ligado e sem cortes THEN o resultado SHALL ser `aprovado`, independentemente da placa.
5. WHEN as regras de "veículo ligado" e "sem cortes" são avaliadas THEN elas SHALL permanecer inalteradas.

**Independent Test**: Vídeo do veículo ligado, sem cortes, placa ilegível/ausente → aprova. Placa da selfie divergente da do vídeo do app → rejeita selfie e vídeo do app, mas não o vídeo do veículo.

---

## Edge Cases

- WHEN apenas uma das duas fontes (selfie ou vídeo do app) tem placa THEN não há comparação possível e o sistema SHALL NÃO rejeitar por placa (`placaConfere = null`).
- WHEN fixtures/testes referenciam a placa do vídeo do veículo THEN eles SHALL ser atualizados para refletir a remoção dessa fonte.

---

## Success Criteria

- [ ] Cruzamento de placa restrito a selfie × vídeo do app.
- [ ] Vídeo do veículo não é mais fonte nem alvo de rejeição por placa.
- [ ] Demais regras do vídeo do veículo (ligado, sem cortes) intactas.
- [ ] `npm test` (suite de cruzamento) verde após a mudança.
