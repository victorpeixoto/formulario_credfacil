# Vídeo do veículo rejeitado não bloqueia "Continuar Análise" (WhatsApp) — Tasks

**Data:** 2026-06-04
**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)
**ClickUp:** [86ahw4mfb](https://app.clickup.com/t/86ahw4mfb)

---

- [x] **T1** Em `app/(auth)/status/page.tsx`, derivar `videoVeiculoRejeitado = dados.documentos.videoVeiculo?.status === 'rejeitado'`.
- [x] **T2** Renderizar `SecaoContato` (botão WhatsApp) quando `temPendencia && videoVeiculoRejeitado`, junto ao banner de pendência (sem remover o reenvio).
- [x] **T3** Chamar `buscarWhatsApp()` também nesse caso (no load inicial e no evento `concluido`), hoje restrito a `APROVADO`/`ANALISE_MANUAL`.
- [x] **T4** Parametrizar o texto do `SecaoContato` (prop `variante`) para não dizer "Documentos aprovados!" quando vier da pendência (ex.: "Continuar análise com a equipe").
- [x] **T5** Garantir que os `CardDocumento` do vídeo do veículo continuam reenviáveis (sem alteração de comportamento).
- [ ] **T6** Teste manual: vídeo do veículo rejeitado → status `PENDENCIA` → botão "Falar no WhatsApp" aparece + card reenviável.
- [ ] **T7** Teste manual: reenviar novo vídeo válido → fluxo de reenvio normal.

## Validação final
- [x] `npm run lint` limpo nos arquivos tocados.
- [x] Confirmar (sem alterar) que `determinar-status.ts` segue retornando `PENDENCIA`.
- [ ] Atualizar a task `86ahw4mfb` no ClickUp após merge.

**Dependências:** nenhuma (quick win, UI da tela de status).
**Decisão em aberto:** liberar o WhatsApp só quando o vídeo do veículo é a única rejeição, ou sempre que ele estiver rejeitado (default proposto). Confirmar com o cliente.
