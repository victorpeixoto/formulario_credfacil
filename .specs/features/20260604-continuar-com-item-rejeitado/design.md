# Vídeo do veículo rejeitado não bloqueia "Continuar Análise" (WhatsApp) — Design

**Data:** 2026-06-04
**Spec:** [spec.md](./spec.md)
**ClickUp:** [86ahw4mfb](https://app.clickup.com/t/86ahw4mfb)

---

## Comportamento correto (esclarecido pelo cliente)

Quando o **Vídeo do Veículo (ligado)** é rejeitado e aparece no status como rejeitado, o botão de **"Continuar Análise" → WhatsApp** deve **continuar aparecendo** (não pode ser bloqueado), encaminhando o candidato para o atendimento. O candidato também deve **continuar podendo reenviar** um novo vídeo dentro das especificações, se quiser.

> Não é o botão "Continuar mesmo assim" no wizard. É a tela de **status**: a rejeição do vídeo do veículo não pode esconder o botão de WhatsApp.

## Estado atual (o que bloqueia hoje)

Em `app/(auth)/status/page.tsx`, o botão de WhatsApp (`SecaoContato`, "Falar no WhatsApp") **só** é renderizado quando o status final é `APROVADO` ou `ANALISE_MANUAL`:

```
{aprovado && (<SecaoContato .../>)}
...
{analiseManual && (<... /> <SecaoContato .../>)}
```

E `buscarWhatsApp()` só é chamado nesses dois estados (linhas ~103-104, ~129-130).

Com vídeo do veículo rejeitado, `determinarStatusFinal` retorna **`PENDENCIA`** (há `algumRejeitado`). No estado `PENDENCIA`, a tela mostra **apenas** o banner "Documentos pendentes / reenviar" — **sem** o botão de WhatsApp. É exatamente o bloqueio que o cliente quer remover.

## Arquivos

| Papel | Arquivo |
|---|---|
| Tela de status (gating do botão WhatsApp) | [app/(auth)/status/page.tsx](../../../app/(auth)/status/page.tsx) |
| Botão WhatsApp reaproveitável | [components/portal/secao-contato.tsx](../../../components/portal/secao-contato.tsx) |
| Cards de documento (reenvio) | [components/portal/card-documento.tsx](../../../components/portal/card-documento.tsx) |
| Regra de status (não muda) | [lib/ai/pipeline/determinar-status.ts](../../../lib/ai/pipeline/determinar-status.ts) |

## Decisão técnica (somente UI, na tela de status)

1. **Derivar um flag** na render: `videoVeiculoRejeitado = dados.documentos.videoVeiculo?.status === 'rejeitado'`.
2. **Renderizar o `SecaoContato`** (botão WhatsApp) quando `temPendencia && videoVeiculoRejeitado`, em conjunto com o banner de pendência — assim o candidato pode **tanto** ir ao WhatsApp **quanto** reenviar o vídeo.
3. **Buscar o link** do WhatsApp nesse caso: chamar `buscarWhatsApp()` também quando o estado inicial / `concluido` for `PENDENCIA` com vídeo do veículo rejeitado (hoje só dispara em `APROVADO`/`ANALISE_MANUAL`).
4. **Manter o reenvio**: os `CardDocumento` com `onReenviar` continuam como estão; o vídeo do veículo segue reenviável (com as instruções/specs).
5. **Texto:** o `SecaoContato` atual diz "Documentos aprovados!". Como agora pode aparecer em pendência, parametrizar o título/subtítulo (ex.: prop `variante`) para um texto neutro como "Continuar análise com a equipe" quando vier da pendência, evitando dizer "aprovado" indevidamente.

**Sem mudança no pipeline / `determinar-status.ts`** — o status segue `PENDENCIA`; muda apenas a apresentação na tela de status.

## Escopo da regra

Foco do card: **vídeo do veículo**. Por padrão, liberar o botão quando o vídeo do veículo está rejeitado. Outras rejeições continuam exibindo o fluxo de reenvio normal.

**Decisão em aberto:** liberar o WhatsApp também quando *outros* documentos estão rejeitados junto com o vídeo, ou só quando o vídeo do veículo é a rejeição? Default proposto: liberar sempre que o vídeo do veículo estiver rejeitado (independente dos demais), pois a continuidade é feita por atendimento humano. Confirmar com o cliente se quiser restringir.

## Testes

- Manual: forçar rejeição do vídeo do veículo → status `PENDENCIA` → a tela mostra **o botão "Falar no WhatsApp"** + o card do vídeo reenviável.
- Manual: reenviar um novo vídeo válido → fluxo de reenvio funciona normalmente.
- Verificar que o texto exibido não afirma "aprovado" quando vindo de pendência.
