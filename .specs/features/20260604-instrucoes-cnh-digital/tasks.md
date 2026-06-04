# CNH: PDF obrigatório (CNH Digital) + validade mínima de 30 dias — Tasks

**Data:** 2026-06-04
**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)
**ClickUp:** [86ahw4m0p](https://app.clickup.com/t/86ahw4m0p) · relacionada [86ahw4m6u](https://app.clickup.com/t/86ahw4m6u)

---

## Instrução (cópia)
- [x] **T1** Atualizar `TITULOS.cnh` em `app/(auth)/documentos/page.tsx` exigindo o PDF do app CNH Digital.
- [x] **T2** Atualizar `CONFIG.cnh.dicas` em `components/captura/captura-documento.tsx` (passo de exportar PDF; remover tom de "foto ou PDF").

## Enforcement (captura só PDF)
- [x] **T3** Em `captura-documento.tsx`, para `tipo === 'cnh'`, aceitar **apenas** `.pdf` no input e **remover** o botão de câmera/foto. Manter `image/*,.pdf` para o comprovante.
- [x] **T4** Confirmar o processamento de CNH em PDF pelo `pdf-to-img` (inclusive multipágina).

## Validade ≥ 30 dias
- [x] **T5** Adicionar `DIAS_MINIMOS_VALIDADE_CNH = 30` em `lib/ai/pipeline/config.ts`.
- [x] **T6** Em `lib/ai/validacoes/cnh.ts`, reprovar quando `validade < hoje + 30 dias` com motivo "CNH próxima do vencimento. É necessário pelo menos 30 dias de validade na data da análise."; manter "CNH vencida" e "Data de validade não identificada".
- [x] **T7** Unit test (`node --test`): validade 40d → ok; 10d → "próxima do vencimento"; vencida → "CNH vencida"; sem validade → "não identificada".

## Validação final
- [x] `npm test` verde · `npm run lint` limpo nos arquivos tocados.
- [ ] Teste manual: imagem na CNH não é aceita; PDF com validade > 30d aprova; PDF com < 30d reprova informando os 30 dias.
- [ ] Atualizar as tasks `86ahw4m0p` (e `86ahw4m6u`, se aplicável) no ClickUp após merge.

**Decisão em aberto:** exceção para quem não tem CNH Digital (bloquear foto totalmente vs. permitir como exceção) — afeta T2 e T3.
