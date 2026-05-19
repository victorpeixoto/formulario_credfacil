# Bug — Cliques Duplicados no Wizard de Envio de Documentos — Specification

**Status**: 📋 Especificado — 2026-05-19

---

## Contexto e Gap Identificado

Cliente do projeto reportou em vídeo um comportamento inesperado no fluxo `/documentos` (wizard de envio inicial): durante o passo a passo de captura/envio de CNH, comprovante, selfie e vídeos, o candidato clica mais de uma vez nos botões de ação (presumivelmente por demora perceptível na transição entre estados) e o sistema reage de forma indesejada — provavelmente avançando múltiplos passos, disparando uploads duplicados ou abrindo a câmera em cima de um upload já em andamento.

A causa raiz suspeita é a ausência de:
1. **Estado visual de loading** entre o clique e a próxima tela/transição (o usuário não tem feedback de que o sistema processou o clique).
2. **Bloqueio do botão durante a ação** (cada botão fica clicável durante toda a transição, permitindo cliques múltiplos que entram na fila do React).

Locais suspeitos no código atual (`app/(auth)/documentos/page.tsx`):
- Botão **"Enviar documento" / "Abrir câmera" / "Continuar"** (linhas 290–295): abre `setModoCaptura(...)` mas não desabilita durante a transição.
- Botão **"Continuar"** após upload (linha 300): chama `setPasso(passo + 1)` sem trava — duplo clique pula 2 passos.
- Botão **"Refazer"** (linhas 306–314 e 188–196 no resumo): reseta estado e abre câmera; cliques múltiplos podem encavalar.
- Botão **"Enviar para análise"** no resumo (linhas 205–211): já tem `disabled={enviandoPipeline}`, mas o `setEnviandoPipeline(true)` só dispara no `onClick` — janela pequena permite dois cliques quase simultâneos.
- Botão **"Voltar"** no `passo-wizard.tsx` (linhas 28–37): também sem trava.

**Situação atual:**
- Clique único durante upload → cobertos pelo flag `enviando` no item.
- Clique múltiplo em "Continuar" → React pode bufferizar `setPasso(p+1)` chamadas com `p` capturado no closure e pular passos.
- Clique múltiplo em "Enviar documento" → pode abrir o modo de captura duas vezes (segunda chamada sobrescreve, mas estado intermediário fica inconsistente).
- Sem indicador de loading durante transição entre passo N e passo N+1.

**Situação desejada:**
- Todo botão que dispara uma transição assíncrona ou de estado fica visualmente em loading (spinner inline ou texto) e desabilitado até a transição concluir.
- Botões de navegação síncronos (Continuar/Voltar/Refazer) usam funcional `setState((prev) => ...)` ou flag de "transicionando" para tornar cliques duplicados idempotentes.
- O usuário recebe feedback imediato (<50ms) ao clicar, mesmo que a próxima tela demore para montar.

---

## Problem Statement

Candidatos clicam múltiplas vezes nos botões do wizard de documentos por falta de feedback visual, causando estados inconsistentes: pulos de passos, uploads duplicados e cliques em botões que já dispararam ação. Isso resulta em retrabalho, erros de upload e impressão de instabilidade no produto.

## Goals

- [ ] Nenhum clique duplicado em botões do wizard de `/documentos` produz efeito além do primeiro
- [ ] Todo botão que dispara ação assíncrona mostra spinner + texto "Processando..." ou equivalente enquanto a ação corre
- [ ] Botões de navegação (Continuar, Voltar, Refazer) ficam visualmente desabilitados por pelo menos 300ms após o clique (ou até a transição concluir, o que vier primeiro)
- [ ] Setters de estado React não dependem de closures que pulam passos com cliques rápidos consecutivos
- [ ] Comportamento testado manualmente em mobile (Android Chrome) com toque rápido (3+ taps em <500ms)

## Out of Scope

- Refatorar os componentes `CapturaDocumento`, `CapturaSelfie`, `CapturaVideo` internamente (apenas se o bug se manifestar lá também).
- Reescrever o fluxo do wizard ou introduzir biblioteca de form/state (Zustand, etc.).
- Mudar o design visual dos botões além do necessário para o estado de loading.
- Mudanças no fluxo de reenvio em `/status` (coberto na spec `simplificacao-navegacao-pos-envio`).

## Critérios de Aceite

1. **Trava de clique duplo em "Continuar":** clicar 3x rapidamente em "Continuar" após upload bem-sucedido avança exatamente 1 passo, não 3.
2. **Trava de clique duplo em "Enviar documento" / "Abrir câmera":** abre a captura exatamente uma vez por sequência rápida de cliques.
3. **Trava de clique duplo em "Refazer":** reseta o item exatamente uma vez; não dispara múltiplas aberturas de câmera.
4. **Trava de clique duplo em "Enviar para análise":** dispara `POST /api/validacao/iniciar` exatamente uma vez por sessão de cliques rápidos.
5. **Feedback visual:** todo botão acima troca o texto para versão de loading (`"Abrindo..."`, `"Avançando..."`, `"Iniciando análise..."`) e mostra um spinner enquanto ocupado.
6. **Botão voltar (`passo-wizard.tsx`)**: cliques duplos no voltar não retrocedem mais de 1 passo.
7. **Regressão zero:** o fluxo feliz (1 clique por botão, conexão normal) continua idêntico em UX visível.

## Stakeholders

- **Solicitante:** cliente do projeto (vídeo enviado em 2026-05-19).
- **Implementação:** time de frontend formulario-credfacil.
- **Validação:** QA manual em dispositivo Android low-end (simula latência percebida que gera o duplo clique).
