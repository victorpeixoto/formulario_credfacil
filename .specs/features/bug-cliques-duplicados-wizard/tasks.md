# Bug — Cliques Duplicados no Wizard — Tasks

**Spec:** [spec.md](./spec.md) | **Design:** [design.md](./design.md)

---

## Setup

- [ ] **T1.** Criar diretório `lib/hooks/` se ainda não existe em `formulario-credfacil/`.

## Hook utilitário

- [ ] **T2.** Implementar `lib/hooks/use-acao-unica.ts` conforme assinatura no design.md §1. Exportar `useAcaoUnica`.
- [ ] **T3.** Adicionar comentário curto no topo do arquivo explicando o duplo mecanismo (`useRef` síncrono + `useState` para re-render).

## Componente auxiliar (opcional, decidir após T6)

- [ ] **T4.** Avaliar se o padrão de botão verde com loading se repete 4+ vezes. Se sim, criar `components/ui/botao-principal.tsx` com props `{ executando, textoExecutando, onClick, disabled?, children, variante? }`. Se não, pular.

## Aplicação no fluxo de documentos

- [ ] **T5.** Em `app/(auth)/documentos/page.tsx`, instanciar `useAcaoUnica` para cada uma destas ações distintas: abrir captura, continuar passo, refazer passo atual, enviar para análise. Nomear claramente (`acaoAbrirCaptura`, `acaoContinuar`, etc).
- [ ] **T6.** Trocar todos os `onClick={() => fn()}` dos botões afetados por `onClick={() => acaoXxx.executar(() => fn())}`. Adicionar `disabled={acaoXxx.executando}` em cada botão.
- [ ] **T7.** Trocar `setPasso(passo + 1)` por `setPasso((p) => p === passo ? p + 1 : p)` no botão "Continuar" após upload.
- [ ] **T8.** No resumo (passo 5), tratar cada botão "Refazer" por tipo com instância própria ou um único hook + guard que ignora se outro tipo já está sendo refeito.
- [ ] **T9.** Adicionar versões "executando" do texto: `"Abrindo..."`, `"Avançando..."`, `"Resetando..."`, manter `"Iniciando análise..."` que já existe.
- [ ] **T10.** Confirmar que o spinner inline aparece à esquerda do texto nos botões em estado `executando`.

## Trava no wizard component

- [ ] **T11.** Em `components/captura/passo-wizard.tsx`, importar `useAcaoUnica` e envolver o `onVoltar` com `executar`. Adicionar `disabled` no botão de voltar quando `executando`.

## Validação manual

- [ ] **T12.** Em desktop, simular cliques duplos em cada botão do fluxo `/documentos` com DevTools de throttling de CPU 4x (simula mobile lento). Verificar que cada critério de aceite (1–7 da spec) passa.
- [ ] **T13.** Testar em dispositivo Android real com toque rápido (3+ taps em <500ms) em todos os botões.
- [ ] **T14.** Cronometrar o fluxo feliz fim-a-fim antes e depois — não deve ficar perceptivelmente mais lento (tolerância: +5% por passo).
- [ ] **T15.** Verificar console do navegador — não deve haver requisições duplicadas em `Network` para `/api/upload/presigned-url`, PUT do S3, ou `/api/validacao/iniciar`.

## Documentação e fechamento

- [ ] **T16.** Atualizar `STATE.md` registrando a decisão de adotar `useAcaoUnica` como padrão para botões de transição no portal logado.
- [ ] **T17.** Marcar o status da spec como ✅ Implementado com a data.
