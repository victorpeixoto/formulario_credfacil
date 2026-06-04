# CTA "comprovante não está no meu nome" (terceiro/parente) — Tasks

**Data:** 2026-06-04
**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)
**ClickUp:** [86ahf4g21](https://app.clickup.com/t/86ahf4g21)

---

- [x] **T1** Em `app/(auth)/documentos/page.tsx`, adicionar CTA discreto "O comprovante não está no meu nome?" na etapa do comprovante.
- [x] **T2** Ao acionar o CTA, exibir confirmação curta: afirmar que o comprovante é de **terceiro/parente** + texto "Para concluir, na próxima etapa você precisará enviar o documento do titular do comprovante." (opcional: select simples de grau de parentesco).
- [x] **T3** Ao confirmar, marcar o comprovante como `analise_manual` com motivo de terceiro, reusando o sinal `comprovanteNomeDivergente` (ou flag `comprovanteTerceiro`) para que o envio resulte em `ANALISE_MANUAL`.
- [x] **T4** Pular a validação automática da IA para o comprovante quando o candidato já afirmou ser de terceiro.
- [x] **T5** Verificar (sem alterar) que `determinar-status.ts` resulta em `ANALISE_MANUAL` e que o banner existente da tela de status (`app/(auth)/status/page.tsx` ~274-301) aparece instruindo o envio do documento do titular.
- [ ] **T6** Teste manual: acionar CTA → afirmar terceiro/parente → confirmar → comprovante `analise_manual`, envio `ANALISE_MANUAL`, banner do titular visível.

## Validação final
- [x] `npm test` verde (fluxo principal do comprovante sem regressão).
- [x] `npm run lint` limpo nos arquivos tocados.
- [ ] Atualizar a task `86ahf4g21` no ClickUp após merge.

## Decisões em aberto
- Coletar grau de parentesco no CTA ou só afirmar "de terceiro" (default: afirmação simples + parentesco opcional).
- Reusar `comprovanteNomeDivergente` vs. criar `comprovanteTerceiro` (default: reusar).

## Não fazer (fora de escopo)
- ❌ Geração/download de declaração em PDF.
- ❌ Upload de declaração assinada / contrato / opções A/B/C.
- ❌ Fila/tela nova no painel.
