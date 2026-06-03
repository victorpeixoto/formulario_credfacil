# Refatoração do Pipeline de Validação de Documentos — Especificação

**Data:** 2026-05-29
**Status:** Aguardando aprovação
**Branch sugerida:** `refactor/pipeline-validacao`
**Feature de origem:** `validacao-documentos-ia`

---

## Problema

O pipeline de validação de documentos com IA (`lib/ai/` + `app/api/validacao/`) está **funcionalmente correto**, mas é **lento e difícil de manter**. As validações rodam de forma 100% sequencial com pausas fixas de 2s entre cada uma, fazendo o processo levar de 2 a 5 minutos. A lógica de cruzamento está duplicada em dois módulos (`cruzamento-inline.ts` e `cruzamento.ts`), os thresholds estão espalhados e *hardcoded* fora do `config.ts`, e o banco é consultado 8–10 vezes por execução. Isso gera lentidão percebida pelo candidato e alto custo de manutenção para a equipe.

## Goals

- [ ] Reduzir o tempo total de validação de ~3 min para **< 60s** no caso comum (paralelizando chamadas independentes de IA).
- [ ] Ter **uma única fonte de verdade** para regras de cruzamento e thresholds.
- [ ] Reduzir as operações no MongoDB para **2 por execução** (1 leitura inicial, 1 escrita final).
- [ ] **Preservar 100% das regras de negócio atuais** (nenhuma mudança de comportamento de aprovação/rejeição).
- [ ] Corrigir o bug de UI onde `analise_manual` aparece como "analisando" indefinidamente.

## Out of Scope

- **Não** mudar as regras de negócio (thresholds, prazos, faturamento mínimo, etc.) — apenas centralizá-las.
- **Não** trocar os provedores de IA (Gemini / Rekognition permanecem).
- **Não** implementar a fila/worker assíncrono (`feature/fila-validacao-documentos`) — esta refatoração prepara o terreno mas a fila é trabalho separado.
- **Não** redesenhar a UI do portal/wizard.

---

## User Stories

### P1: Validação paralela e rápida ⭐ MVP

**User Story**: Como candidato, quero que meus documentos sejam analisados em poucos segundos, para não esperar minutos olhando uma tela de "analisando".

**Why P1**: É a dor central — o tempo de 2–5 min é o principal motivo da refatoração e impacta diretamente a experiência do candidato.

**Acceptance Criteria**:

1. WHEN o pipeline recebe N documentos para validar THEN o sistema SHALL executar as chamadas de IA independentes em paralelo (`Promise.all`), não em série.
2. WHEN duas validações são independentes (ex.: CNH e vídeo do veículo) THEN o sistema SHALL NÃO inserir pausa fixa entre elas.
3. WHEN uma chamada de IA retorna erro 429 (rate limit) THEN o sistema SHALL aplicar retry com backoff, mantendo o comportamento de resiliência atual.
4. WHEN todos os documentos de um envio típico (5 docs + biometria) são processados THEN o tempo total SHALL ser < 60s em condições normais.

**Independent Test**: Submeter um conjunto completo de documentos válidos e medir o tempo entre `statusDocumentos = PROCESSANDO` e o evento SSE `concluido` — deve ser < 60s, e os logs devem mostrar execução concorrente.

---

### P1: Fonte única de regras de cruzamento ⭐ MVP

**User Story**: Como desenvolvedor, quero que a lógica de comparação documento×cadastro exista em um único lugar, para alterar uma regra sem caçar duplicatas.

**Why P1**: A duplicação entre `cruzamento-inline.ts` e `cruzamento.ts` é a principal fonte de bugs e de confusão relatada.

**Acceptance Criteria**:

1. WHEN uma regra de cruzamento (nome, endereço, placa, CPF, biometria) é avaliada THEN ela SHALL vir de um único módulo puro, sem I/O.
2. WHEN um threshold é usado em qualquer ponto do pipeline THEN ele SHALL ser importado de `lib/ai/pipeline/config.ts` (nenhum valor mágico hardcoded).
3. WHEN o cruzamento é executado THEN o resultado por documento E o objeto `validacaoIA` SHALL ser calculados a partir da mesma função, eliminando recálculo.

**Independent Test**: Buscar por números mágicos (85, 80, 90, 70, 3500) fora de `config.ts` no diretório `lib/ai/` — não deve haver ocorrências nas regras. Testes unitários do módulo de cruzamento passam com os mesmos vetores de entrada/saída de antes.

---

### P2: Acesso mínimo ao banco

**User Story**: Como mantenedor da infraestrutura, quero que o pipeline leia e escreva no MongoDB o mínimo necessário, para reduzir carga e latência.

**Why P2**: Importante para custo/latência, mas o ganho percebido pelo usuário vem majoritariamente da paralelização (P1).

**Acceptance Criteria**:

1. WHEN o pipeline executa uma validação completa THEN o sistema SHALL realizar no máximo 1 leitura do candidato no início e 1 escrita consolidada no fim.
2. WHEN o status precisa refletir progresso parcial THEN o sistema SHALL atualizar status de progresso via mecanismo enxuto (1 update por transição relevante), sem `findOne` dentro de loop.

**Independent Test**: Instrumentar/contar as chamadas a `collection('conversations')` em uma execução — não deve haver `findOne` dentro de loops por documento.

---

### P2: Estado consistente na UI

**User Story**: Como candidato cujo comprovante caiu em análise manual, quero ver um status claro ("em análise"), não um spinner eterno de "analisando".

**Why P2**: É um bug real de UX, mas afeta apenas o subconjunto de casos `analise_manual`.

**Acceptance Criteria**:

1. WHEN um documento tem status `analise_manual` THEN o endpoint SSE SHALL mapeá-lo para um status de UI distinto de `analisando`.
2. WHEN o status final é `ANALISE_MANUAL` THEN a UI SHALL conseguir distinguir esse estado de `PROCESSANDO`.

**Independent Test**: Forçar um comprovante em nome de terceiro com endereço correto e verificar que o evento SSE do documento não fica preso em `analisando`.

---

## Edge Cases

- WHEN uma chamada de IA falha definitivamente (após retries) THEN o sistema SHALL marcar o documento como `erro` e o status final SHALL ser `PENDENCIA` (nunca `APROVADO`).
- WHEN só há reenvio de um subconjunto de documentos THEN o sistema SHALL validar apenas os reenviados e recalcular o status final considerando os documentos já aprovados.
- WHEN a biometria depende de CNH+selfie e um deles não foi enviado neste lote THEN o sistema SHALL reaproveitar a URL já armazenada, mantendo o comportamento atual.
- WHEN o pipeline é interrompido no meio (kill do processo) THEN nenhum documento SHALL ficar permanentemente travado em `processando` sem possibilidade de reprocessamento.

---

## Success Criteria

- [ ] Tempo de validação de um lote completo < 60s (era 2–5 min).
- [ ] Zero números mágicos de threshold fora de `config.ts` em `lib/ai/`.
- [ ] Lógica de cruzamento existe em exatamente 1 módulo (não 2).
- [ ] Máximo de 2 operações de banco "pesadas" (read inicial + write final) por execução.
- [ ] Suite de testes do cruzamento cobre os mesmos casos das regras de negócio e passa.
- [ ] Comportamento de aprovação/rejeição idêntico ao atual (verificado por testes de regressão com casos reais).
