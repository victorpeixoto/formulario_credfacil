# CTA "comprovante não está no meu nome" (terceiro/parente) — Especificação

**Data:** 2026-06-04
**Status:** Aguardando aprovação
**ClickUp:** [86ahf4g21](https://app.clickup.com/t/86ahf4g21) (prioridade *high*, in progress)
**Branch sugerida:** `feature/cta-comprovante-terceiro`
**Feature de origem:** `validacao-documentos-ia`

---

## Problema

O fluxo de comprovante de residência reprova quando o nome do comprovante não bate com o do cadastro. Cenários comuns no Brasil (mora com os pais, conta no nome do cônjuge, aluguel informal) ficam sem saída clara. Falta um caminho simples para o candidato **afirmar que o comprovante é de um terceiro/parente** e seguir para análise manual, sabendo que precisará enviar o documento do titular.

## Goals

- [ ] Oferecer um CTA "O comprovante não está no meu nome?" na etapa do comprovante.
- [ ] Permitir que o candidato afirme que o comprovante é de terceiro/parente.
- [ ] Informar que, para concluir, na próxima etapa será necessário enviar o documento do titular.
- [ ] Manter o comprovante em `analise_manual` nesses casos.

## Out of Scope

- **Não** gerar/baixar declaração de residência em PDF.
- **Não** implementar upload de declaração assinada, contrato de aluguel, nem opções A/B/C.
- **Não** criar fila/tela nova no painel — reaproveitar o fluxo de análise manual existente.
- **Não** alterar o fluxo principal (comprovante no próprio nome → IA automática).

---

## User Stories

### P1: Afirmar comprovante de terceiro e ir para análise manual ⭐ MVP

**User Story**: Como candidato cujo comprovante está no nome de um parente, quero declarar isso e seguir, sabendo que vou precisar enviar o documento do titular, para conseguir concluir o cadastro.

**Acceptance Criteria**:

1. WHEN o candidato está na etapa do comprovante THEN a UI SHALL exibir um CTA "O comprovante não está no meu nome?".
2. WHEN o candidato aciona o CTA THEN a UI SHALL permitir afirmar que o comprovante é de **terceiro/parente**.
3. WHEN o candidato confirma a afirmação THEN a UI SHALL informar que, para conclusão, **na próxima etapa será necessário enviar o documento do titular** do comprovante.
4. WHEN o candidato confirma THEN o comprovante SHALL ficar com status `analise_manual` (não rejeitado, sem aprovação automática).
5. WHEN o comprovante está em `analise_manual` por esse motivo THEN o status final do envio SHALL ser `ANALISE_MANUAL`.
6. WHEN o candidato NÃO aciona o CTA THEN o fluxo automático da IA para o comprovante SHALL permanecer inalterado.

**Independent Test**: Na etapa do comprovante, acionar o CTA, afirmar terceiro/parente, confirmar → comprovante em `analise_manual`, envio em `ANALISE_MANUAL`, e a tela informa o envio do documento do titular na próxima etapa.

---

## Edge Cases

- WHEN o candidato aciona o CTA mas não confirma a afirmação THEN o comprovante SHALL permanecer no fluxo normal (não vai para `analise_manual`).
- WHEN o envio entra em `analise_manual` THEN a tela de status SHALL exibir o banner já existente instruindo o envio do documento do titular (CNH/RG/Certidão) via o canal de atendimento.
- WHEN o comprovante está no próprio nome e é válido THEN nada muda.

---

## Success Criteria

- [ ] CTA disponível na etapa do comprovante.
- [ ] Afirmação de terceiro/parente leva o comprovante a `analise_manual` e o envio a `ANALISE_MANUAL`.
- [ ] Mensagem clara de que o documento do titular será necessário na próxima etapa.
- [ ] Fluxo principal do comprovante inalterado.
- [ ] Nenhuma geração de PDF / upload de declaração implementada.
