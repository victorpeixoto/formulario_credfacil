# CTA "comprovante não está no meu nome" (terceiro/parente) — Design

**Data:** 2026-06-04
**Spec:** [spec.md](./spec.md)
**ClickUp:** [86ahf4g21](https://app.clickup.com/t/86ahf4g21)

---

## Escopo correto (esclarecido pelo cliente)

**Não** construir geração/download de declaração, upload de declaração assinada, nem as opções A/B/C. O card é apenas:

1. Um **CTA** "O comprovante não está no meu nome?" na etapa do comprovante.
2. Ao tocar, o candidato **afirma** que o comprovante é de **terceiro/parente**.
3. A UI informa que, para conclusão, **na próxima etapa será necessário enviar o documento do titular**.
4. O comprovante fica em **`analise_manual`** (não rejeitado, não aprovado automaticamente).

O envio efetivo do documento do titular acontece na "próxima etapa" — o fluxo de análise manual que **já existe** (banner na tela de status, via WhatsApp). Este card não implementa esse upload.

## O que já existe e será reaproveitado

- `determinarStatusFinal` (`lib/ai/pipeline/determinar-status.ts`) **já produz `ANALISE_MANUAL`** quando `comprovanteNomeDivergente === true` (com os demais aprovados). Não precisa mudar a função.
- A tela de status (`app/(auth)/status/page.tsx`, ~linhas 274-301) **já tem o banner** de `analise_manual` para comprovante em nome de terceiro, instruindo o envio dos documentos do titular (CNH/RG/Certidão) + `SecaoContato` (WhatsApp). Esse é o "próxima etapa".

Ou seja: a infra de status e a comunicação do "envie o documento do titular" já estão prontas. O que falta é o **CTA proativo de afirmação** no fluxo do comprovante.

## Arquivos

| Papel | Arquivo |
|---|---|
| Etapa do comprovante (onde entra o CTA) | [app/(auth)/documentos/page.tsx](../../../app/(auth)/documentos/page.tsx) — `TITULOS.comprovante` / passo do comprovante |
| Banner de análise manual (reaproveitar) | [app/(auth)/status/page.tsx](../../../app/(auth)/status/page.tsx) (~274-301) |
| Status final (não muda) | [lib/ai/pipeline/determinar-status.ts](../../../lib/ai/pipeline/determinar-status.ts) |
| Marca de terceiro no documento | modelo do documento `comprovante` em `conversations` |

## Decisão técnica

1. **CTA na etapa do comprovante** (`documentos/page.tsx`): link/botão discreto "O comprovante não está no meu nome?".
2. **Confirmação curta**: ao tocar, exibir um aviso e a afirmação — comprovante é de **terceiro/parente** — com texto: *"Para concluir, na próxima etapa você precisará enviar o documento do titular do comprovante."* (Opcional: campo simples de grau de parentesco; manter mínimo.)
3. **Persistência**: ao confirmar, marcar o comprovante como `analise_manual` com um motivo/flag de terceiro. Reaproveitar o sinal existente `comprovanteNomeDivergente` (ou um `comprovanteTerceiro` explícito) para que `determinarStatusFinal` resulte em `ANALISE_MANUAL`.
4. **Sem validação automática da IA** para o comprovante quando o candidato já afirmou ser de terceiro — vai direto para `analise_manual`.
5. **Próxima etapa**: o envio do documento do titular usa o fluxo de análise manual já existente (banner + WhatsApp na tela de status). Nada novo a construir aqui.

**Não construir:** geração de PDF, endpoint de declaração, upload de declaração assinada, opções A/B/C, fila nova no painel.

## Decisão em aberto

- Coletar o **grau de parentesco** no CTA (campo simples) ou apenas afirmar "de terceiro"? Default proposto: afirmação simples + (opcional) parentesco em um único select curto.
- Reusar a flag `comprovanteNomeDivergente` vs. criar `comprovanteTerceiro` dedicado. Default: reusar a flag existente para não duplicar caminhos de status.

## Testes

- Manual: na etapa do comprovante, tocar no CTA, afirmar terceiro/parente, confirmar → comprovante em `analise_manual`, envio em `ANALISE_MANUAL`.
- Manual: tela de status mostra o banner instruindo o envio do documento do titular (fluxo já existente).
- Regressão: comprovante no próprio nome segue no fluxo automático da IA, inalterado.
