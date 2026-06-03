# Refatoração do Pipeline de Validação — Tasks

**Design**: `.specs/features/refatoracao-pipeline-validacao/design.md`
**Status**: Implementado (T1–T10 ✅ · T11 verde na regressão; tempo/casos manuais pendentes de dev/staging)

---

## Execution Plan

### Fase 0: Rede de segurança (Sequencial — fazer ANTES de tocar no código)

```
T1 → T2
```

### Fase 1: Fundação — centralizar e unificar (Sequencial)

```
T3 → T4 → T5
```

### Fase 2: Aplicar no pipeline (Parcialmente paralelo)

```
       ┌→ T6 ─┐
T5 ────┼→ T7 ─┼──→ T9
       └→ T8 ─┘
```

### Fase 3: Validação e limpeza (Sequencial)

```
T9 → T10 → T11
```

---

## Task Breakdown

### T1: Capturar vetores de regressão (baseline AS-IS)

**What**: Coletar entradas/saídas reais do cruzamento atual para usar como gabarito de "comportamento idêntico".
**Where**: `lib/ai/pipeline/__tests__/fixtures-cruzamento.ts`
**Depends on**: None
**Reuses**: `cruzamento.ts`, `cruzamento-inline.ts` atuais

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Pelo menos 8 casos cobertos: CNH ok/CPF divergente/nome divergente; comprovante ok/endereço divergente/nome de terceiro; videoApp nome divergente; placa divergente entre fontes; biometria 95%/85%/70%. → **11 casos** em `fixtures-cruzamento.ts`.
- [x] Cada caso registra entrada (`dadosExtraidos` + cadastro) e saída esperada (status por doc + `validacaoIA`) via `intent`.

**Verify**: ✅ O oráculo `cruzamento-atual.ts` (compõe as funções de produção atuais) satisfaz o `intent` de todos os casos — `npm test` verde.

---

### T2: Testes de regressão contra a implementação atual

**What**: Suite que roda os fixtures de T1 contra `cruzarDados` + funções inline atuais e passa.
**Where**: `lib/ai/pipeline/__tests__/cruzamento.regressao.test.ts`
**Depends on**: T1
**Reuses**: fixtures de T1

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Todos os fixtures passam contra o código atual (verde no baseline) — 11/11.
- [x] Teste roda com o runner do projeto: `npm test` (configurado: Node `--test` nativo + TS, loader de alias `@/`, zero dependências novas).

**Verify**: ✅ `npm test` → 11/11 verdes antes de qualquer refatoração.

---

### T3: Consolidar thresholds em `config.ts`

**What**: Adicionar todas as constantes hoje hardcoded ao `config.ts`.
**Where**: `lib/ai/pipeline/config.ts`
**Depends on**: T2
**Reuses**: `config.ts` existente

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Adicionadas: `THRESHOLD_ENDERECO_LOGRADOURO=80`, `THRESHOLD_ENDERECO_BAIRRO=80`, `THRESHOLD_ENDERECO_CIDADE=85`, `PROPORCAO_CAMPOS_ENDERECO=0.7`, `FATURAMENTO_MENSAL_MINIMO=3500`, `MESES_FATURAMENTO=6`. (`THRESHOLD_ENDERECO=0.7`, sem importadores, foi renomeado para `PROPORCAO_CAMPOS_ENDERECO`.)
- [x] Valores idênticos aos hardcoded atuais (nenhuma mudança de regra).

**Verify**: `grep -rnE "\b(85|80|90|70|3500)\b" lib/ai/` não retorna thresholds de regra fora de `config.ts` após T5/T6.

---

### T4: Criar módulo puro `avaliar-cruzamento.ts`

**What**: Função pura única que recebe extraídos + cadastro e devolve status por doc + `validacaoIA` + motivos.
**Where**: `lib/ai/pipeline/avaliar-cruzamento.ts`
**Depends on**: T3
**Reuses**: `calcularSimilaridade` e lógica de `cruzarDados` + `cruzamento-inline.ts`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Exporta `avaliarCruzamento(extraidos, cadastro): ResultadoCruzamento`.
- [x] Absorve CNH (CPF+nome), comprovante (endereço+nome terceiro), videoApp (nomePerfil), biometria e placa entre fontes.
- [x] Importa todos os thresholds de `config.ts` (zero números mágicos).
- [x] Sem nenhuma chamada de I/O (Mongo, fetch, etc.).

**Verify**: ✅ Importa apenas `../cruzamento` (calcularSimilaridade), `./config`, tipos. Não importa `mongodb`, `r2`, `gemini`, `rekognition`. Endereço calculado uma vez e reusado p/ status e `enderecoConfere`.

---

### T5: Apontar testes de regressão para o novo módulo

**What**: Rodar os fixtures de T1 contra `avaliarCruzamento` e garantir saída idêntica ao baseline.
**Where**: `lib/ai/pipeline/__tests__/cruzamento.regressao.test.ts` (estender)
**Depends on**: T4
**Reuses**: fixtures de T1, baseline de T2

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Todos os fixtures passam contra `avaliarCruzamento` com a MESMA saída do baseline (`assert.deepEqual` campo a campo).
- [x] Diferenças (se houver) são reconciliadas mantendo o comportamento atual — nenhuma divergência.

**Verify**: ✅ `npm test` → 22/22 verdes (11 baseline + 11 novo===baseline).

---

### T6: Paralelizar `executarValidacoes` [P]

**What**: Trocar o loop sequencial + delay 2s por execução concorrente, retornando resultados crus.
**Where**: `lib/ai/pipeline/executar-validacoes.ts`
**Depends on**: T5
**Reuses**: `executarComRetry` (retry de 429 atual)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Tarefas executam via `Promise.allSettled`.
- [x] Removido `DELAY_ENTRE_VALIDACOES_MS` do caminho feliz (constante removida do `config.ts`, agora órfã).
- [x] Retorna `Map<tipo, ResultadoTarefa | ErroTarefa>` sem persistir nada (sem callback de DB).
- [x] Falha de uma tarefa não derruba as demais.

**Verify**: ✅ `executar-validacoes.test.ts`: 3 tarefas de 50ms terminam em ~60ms (concorrente); falha isolada vira `ErroTarefa` e as demais seguem.

---

### T7: Limpar cruzamento das funções `validar*` [P]

**What**: Remover lógica de cruzamento que vaza para as validações (ex.: `nomeDivergente` em `comprovante.ts`); manter só a regra própria do doc.
**Where**: `lib/ai/validacoes/comprovante.ts`, `lib/ai/validacoes/video-app.ts`
**Depends on**: T5
**Reuses**: `config.ts` (T3) para faturamento/meses

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `comprovante.ts` não calcula mais `nomeDivergente` (isso passa a viver em `avaliarCruzamento`); removido o param `nomeCadastro` e o `PRAZO_DIAS` hardcoded (usa `PRAZO_COMPROVANTE_DIAS`).
- [x] `video-app.ts` usa `FATURAMENTO_MENSAL_MINIMO` e `MESES_FATURAMENTO` de `config.ts`.
- [x] Cada `validar*` retorna apenas: aprovado por regra própria + dadosExtraidos.
- [x] Bônus (success-criteria "zero números mágicos"): `biometria.ts` usa `THRESHOLD_BIOMETRIA`/`THRESHOLD_BIOMETRIA_MANUAL`.

**Verify**: ✅ `grep "calcularSimilaridade" lib/ai/validacoes/` → 0 ocorrências; regressão segue verde (24/24).

---

### T8: Corrigir `mapearStatus` para `analise_manual` [P]

**What**: Mapear `analise_manual` para um status de UI próprio no SSE.
**Where**: `app/api/validacao/status/route.ts`
**Depends on**: T5
**Reuses**: `mapearStatus` existente

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `analise_manual` retorna status distinto de `analisando` (retorna `analise_manual`).
- [x] UI consegue distinguir o estado (string `analise_manual` alinhada com o front — ver T10).

**Verify**: ✅ `mapearStatus('analise_manual')` agora retorna `'analise_manual'` (linha adicionada antes do fallback `'analisando'`).

---

### T9: Reescrever `executarPipeline` (read único + paralelo + write único)

**What**: Orquestrar 1 read → validações paralelas (T6) → `avaliarCruzamento` (T4) → `determinarStatusFinal` → 1 write consolidado.
**Where**: `app/api/validacao/iniciar/route.ts`
**Depends on**: T6, T7
**Reuses**: `determinarStatusFinal`, `sendTelegramAlert`, `gerarPresignedRead`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] 1 `findOne` no início (cadastro + docs atuais).
- [x] Sem `findOne` dentro de loops (todos os `findOne` em loop foram eliminados).
- [x] Regra de placa entre fontes vem de `avaliarCruzamento` (removida do `route.ts`).
- [x] 1 `updateOne` consolidado final (`setFinal`: documentos + `validacaoIA` + `statusDocumentos` + `analistaAlertado`).
- [x] Alerta Telegram preservado no ramo `ANALISE_MANUAL`.
- [x] Reenvio (`tiposReenvio`) continua funcionando — merge de resultados novos + dados armazenados; só os reenviados (+ trio de placa) são reescritos.

**Verify**: ✅ `tsc --noEmit` limpo. Chamadas a `conversations` por execução = 1 `findOne` + 1 `updateOne` de progresso + 1 `updateOne` final (zero queries em loop).

---

### T10: Alinhar UI ao novo status `analise_manual`

**What**: Tratar o novo status no consumo do SSE no front (card de documento).
**Where**: `components/portal/card-documento.tsx` (e/ou consumidor do SSE)
**Depends on**: T8
**Reuses**: componentes de status existentes

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Documento em `analise_manual` exibe rótulo "Em análise" (não spinner eterno) — `STATUS_CONFIG.analise_manual` em `card-documento.tsx`; `animate-pulse` só liga para `processando`/`enviado`.
- [x] Nenhum estado fica preso em "analisando" indefinidamente.

**Verify**: ✅ Por inspeção do fluxo: SSE emite `analise_manual` (T8) → `mapearStatus` cliente repassa (só converte `analisando`) → `CardDocumento` renderiza "Em análise" sem pulse. A UI já estava preparada; T8 destravou a emissão. Sem mudança de código necessária na UI.

---

### T11: Teste de tempo + regressão end-to-end

**What**: Medir tempo de um lote completo e confirmar comportamento idêntico ponta a ponta.
**Where**: ambiente de dev / staging
**Depends on**: T9, T10
**Reuses**: fixtures (T1), suite (T5)

**Tools**:
- MCP: NONE
- Skill: `verify` (rodar o app e observar)

**Done when**:
- [ ] ⏳ Lote completo (5 docs + biometria) valida em < 60s. → **Requer dev/staging** (credenciais reais Gemini/Rekognition/Mongo/R2). Não executável neste ambiente offline. Estrutura pronta: delays de 2s removidos + `Promise.allSettled` (tempo passa a ser dominado pela IA mais lenta, não pela soma).
- [x] Suite de regressão (T5) verde — 24/24 (`npm test`).
- [ ] ⏳ Casos manuais: aprovado / pendência / análise manual produzem o mesmo `statusDocumentos` de antes. → **Requer dev/staging.** A equivalência da lógica de cruzamento já está travada por T5 (avaliarCruzamento === baseline AS-IS, campo a campo).

**Verify**: ✅ Verificável offline: `tsc --noEmit` limpo, lint dos arquivos tocados limpo, regressão 24/24. ⏳ Pendente em dev/staging: medir Δt `PROCESSANDO`→SSE `concluido` e comparar `statusDocumentos` final com baseline (skill `verify`).

---

## Parallel Execution Map

```
Fase 0 (Sequencial):
  T1 ──→ T2

Fase 1 (Sequencial):
  T3 ──→ T4 ──→ T5

Fase 2 (após T5):
  ├── T6 [P]  paralelizar execução
  ├── T7 [P]  limpar validacoes
  └── T8 [P]  fix mapearStatus
        ↓
  T6, T7 ──→ T9

Fase 3 (Sequencial):
  T8 ──→ T10
  T9, T10 ──→ T11
```

---

## Task Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T1: Fixtures de regressão | 1 arquivo | ✅ Granular |
| T2: Suite de baseline | 1 arquivo | ✅ Granular |
| T3: Constantes no config | 1 arquivo | ✅ Granular |
| T4: Módulo puro de cruzamento | 1 módulo | ✅ Granular |
| T5: Apontar testes p/ novo módulo | 1 arquivo | ✅ Granular |
| T6: Paralelizar execução | 1 arquivo | ✅ Granular |
| T7: Limpar validacoes | 2 arquivos coesos | ⚠️ OK (mesma natureza) |
| T8: Fix mapearStatus | 1 função | ✅ Granular |
| T9: Reescrever pipeline | 1 arquivo | ✅ Granular |
| T10: Alinhar UI | 1 componente | ✅ Granular |
| T11: Verificação e2e | verificação | ✅ Granular |

---

## Princípio-guia

> **Refatoração com comportamento idêntico.** A rede de segurança (T1–T2) vem primeiro: nenhum código de produção muda antes da regressão estar verde no baseline. Cada fase seguinte mantém a suite verde. Se uma saída divergir, o baseline vence — preservamos o comportamento atual de aprovação/rejeição.
