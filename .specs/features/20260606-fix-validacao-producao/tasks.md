# Fix Validação em Produção — Tasks

**Design**: `.specs/features/20260606-fix-validacao-producao/design.md`
**Status**: Implementado parcialmente (T1-T3, T5-T10 concluídas; T4 pendente por validação em container)

## Implementation Status (2026-06-06)

- **Concluído:** T1, T2, T3, T5, T6, T7, T8, T9, T10.
- **Pendente:** T4 validação no container/staging com PDF real.
- **Validações concluídas:** `npm ls @napi-rs/canvas pdf-to-img pdfjs-dist`, `npm test` (34/34), `npx tsc --noEmit`, `npx eslint` nos arquivos tocados, `docker build -t formulario-credfacil-docker-validate .`, `require.resolve('pdfjs-dist/package.json')` dentro do container, `import('pdf-to-img')` dentro do container, `createCanvas(1,1)` dentro do container, `/api/health` com status `healthy`.
- **Correção pós-deploy:** além de `@napi-rs/canvas`, `pdf-to-img` precisa encontrar `pdfjs-dist/package.json` em runtime; `pdfjs-dist@5.4.624` foi declarado e copiado explicitamente para o runner.

---

## Execution Plan

### Phase 1: Track A — PDF / canvas (Sequential)

```
T1 → T2 → T3 → T4(verify)
```

### Phase 2: Track B — 429 / cota (Parallel-ish após T5)

```
T5 ──┬→ T6 ─┐
     └→ T7 ─┴→ T8 → T9(test)
```

### Phase 3: Track C — Runbook (já entregue no design)

```
T10 (revisão/confirmação do runbook em design.md)
```

Track A e Track B são **independentes** entre si e podem ser tocados em paralelo por pessoas diferentes. Dentro de cada track há ordem.

---

## Task Breakdown

### T1: Declarar `@napi-rs/canvas` em dependencies

**What**: Adicionar `@napi-rs/canvas` em `dependencies` do `package.json` (versão compatível com o `pdfjs-dist` instalado).
**Where**: `formulario-credfacil/package.json`
**Depends on**: None
**Reuses**: —

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `@napi-rs/canvas` listado em `dependencies`
- [x] `pdfjs-dist` listado em `dependencies`
- [x] `npm install` roda sem erro e atualiza `package-lock.json`
- [x] `npm install` baixa o binário nativo da plataforma local sem falha

**Verify**:
`npm ls @napi-rs/canvas` lista o pacote resolvido.

---

### T2: Configurar `outputFileTracingIncludes` + `serverExternalPackages`

**What**: Em `next.config.ts`, adicionar `@napi-rs/canvas` a `serverExternalPackages` e criar `outputFileTracingIncludes` para a rota `/api/validacao/iniciar` com os globs do pacote canvas.
**Where**: `formulario-credfacil/next.config.ts`
**Depends on**: T1
**Reuses**: config existente (`output`, `outputFileTracingRoot`)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `serverExternalPackages` inclui `'@napi-rs/canvas'`
- [x] `serverExternalPackages` inclui `'pdfjs-dist'`
- [x] `outputFileTracingIncludes['/api/validacao/iniciar']` inclui globs `./node_modules/@napi-rs/canvas/**/*` e `./node_modules/@napi-rs/canvas-*/**/*`
- [x] `outputFileTracingIncludes['/api/validacao/iniciar']` inclui glob `./node_modules/pdfjs-dist/**/*`
- [x] `npx tsc --noEmit` limpo
- [x] `npm run build` conclui sem erro no build Docker

**Verify**:
Após `npm run build`, confirmar que `.next/standalone/node_modules/@napi-rs/canvas` existe e contém o arquivo `.node`.

---

### T3: Fallback de `COPY` do canvas no Dockerfile (condicional)

**What**: Caso T2 não traga o `.node` para o standalone, adicionar no estágio `runner` do Dockerfile `COPY --from=deps /app/node_modules/@napi-rs/canvas ./node_modules/@napi-rs/canvas`.
**Where**: `formulario-credfacil/Dockerfile`
**Depends on**: T2 (só aplicar se a verificação de T2 falhar)
**Reuses**: estágios `deps`/`runner` existentes

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Se T2 já incluiu o binário → tarefa **dispensada** (registrar no STATE.md)
- [x] Se aplicada → `COPY` presente
- [x] Se aplicada → `COPY` de `pdfjs-dist` presente
- [x] Se aplicada → imagem builda
- [x] Permissões/owner consistentes com o usuário `nextjs`

**Verify**:
`docker build` conclui; `ls node_modules/@napi-rs/canvas` dentro da imagem retorna o pacote.

---

### T4: Validar Track A no container

**What**: Subir a imagem de produção e processar uma CNH em PDF de teste, confirmando ausência do erro de canvas.
**Where**: ambiente Docker (local ou staging Coolify)
**Depends on**: T2 (e T3 se aplicada)
**Reuses**: fluxo `/api/validacao/iniciar`

**Tools**:
- MCP: NONE
- Skill: `verify` (opcional, para rodar/observar o app)

**Done when**:
- [ ] Logs de boot **sem** `Cannot polyfill DOMMatrix/ImageData/Path2D`
- [ ] Validação `cnh` (PDF) retorna `APROVADO/REJEITADO` (não `ERRO ... DOMMatrix`)
- [ ] Validação `biometria` (quando PDF) não falha por canvas

**Verify**:
Enviar CNH PDF de teste e inspecionar os logs do container — sem `DOMMatrix is not defined`.

---

### T5: Criar `GeminiQuotaError` e tipar o esgotamento de 429

**What**: Adicionar a classe `GeminiQuotaError` em `gemini.ts` e ajustar `chamarComRetry` para, após esgotar `MAX_RETRIES` em erro de cota/429, lançar `GeminiQuotaError`; centralizar a detecção em `isQuotaError(msg)`.
**Where**: `formulario-credfacil/lib/ai/gemini.ts`
**Depends on**: None
**Reuses**: `MAX_RETRIES`, `RETRY_DELAY_MS`, lógica atual de `is429`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `GeminiQuotaError` exportada (`name = 'GeminiQuotaError'`)
- [x] `isQuotaError` cobre `429`, `RESOURCE_EXHAUSTED`, `credits are depleted`
- [x] `chamarComRetry` faz no máx. 3 tentativas e lança `GeminiQuotaError` ao esgotar
- [x] `npx tsc --noEmit` limpo

**Verify**:
`npm test` (após T9) + revisão de que erros não-cota mantêm o `throw err` original.

---

### T6: `executarComRetry` não re-tenta erro de cota [P]

**What**: No catch de `executarComRetry`, tratar `GeminiQuotaError` como terminal (ir direto a `rejected`), preservando o retry único para transitórios não-cota e o tratamento de timeout.
**Where**: `formulario-credfacil/lib/ai/pipeline/executar-validacoes.ts`
**Depends on**: T5
**Reuses**: estrutura de `comTimeout`/deadline existente

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `GeminiQuotaError` não dispara o retry extra (vai a `rejected`)
- [x] Timeout e transitórios não-cota mantêm comportamento atual
- [x] `npx tsc --noEmit` limpo

**Verify**:
Teste unitário (T9) com fn que lança `GeminiQuotaError` → exatamente 1 chamada nesse nível, resultado `ErroTarefa`.

---

### T7: Alerta Telegram de cota no pipeline [P]

**What**: Em `executarPipeline` (após `executarValidacoes`), detectar se alguma validação falhou por cota e disparar **um** `sendTelegramAlert` por execução com mensagem acionável.
**Where**: `formulario-credfacil/app/api/validacao/iniciar/route.ts`
**Depends on**: T5
**Reuses**: `sendTelegramAlert`, padrão do alerta de `ANALISE_MANUAL`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Detecta falha de cota a partir do(s) `ErroTarefa` (assinatura de cota/`GeminiQuotaError`)
- [x] Dispara no máximo 1 alerta por execução de pipeline
- [x] Mensagem cita "Créditos Gemini esgotados — recarregar no AI Studio", `cpf` e `formCode`
- [x] Não lança se Telegram indisponível (já tratado em `sendTelegramAlert`)

**Verify**:
Mock de `sendTelegramAlert`; simular 1+ validações com erro de cota → 1 chamada de alerta.

---

### T8: Confirmar mapeamento de erro → `PENDENCIA`

**What**: Garantir (sem alterar lógica) que validação com `GeminiQuotaError` resulta em `statusDocumentos: 'PENDENCIA'`, cobrindo com teste.
**Where**: `formulario-credfacil/lib/ai/pipeline/determinar-status.ts` (somente leitura/teste) + fluxo `iniciar/route.ts`
**Depends on**: T6, T7
**Reuses**: `determinarStatusFinal` integral

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Documento com erro de cota → `status: 'erro'` → `PENDENCIA`
- [x] Nenhuma mudança de regra em `determinarStatusFinal`

**Verify**:
Teste do pipeline com 1 tarefa de cota → `determinarStatusFinal` retorna `PENDENCIA`.

---

### T9: Testes de classificação de cota e retry

**What**: Adicionar teste(s) no runner nativo cobrindo: (a) `chamarComRetry` esgota em 3 e lança `GeminiQuotaError`; (b) `executarComRetry` não re-tenta cota; (c) erro de cota → `ErroTarefa` → `PENDENCIA`.
**Where**: `formulario-credfacil/lib/ai/pipeline/__tests__/`
**Depends on**: T5, T6, T8
**Reuses**: setup de testes existente (`npm test`, loader de alias)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Testes novos cobrindo os 3 cenários acima
- [x] `npm test` verde (incluindo a suíte existente, sem regressão)
- [x] `npx tsc --noEmit` limpo

**Verify**:
`npm test` → todos verdes; contagem de tentativas observada nos mocks = 3.

---

### T10: Revisar runbook no design.md

**What**: Confirmar que os Runbooks 1 (créditos Gemini) e 2 (regressão canvas) no `design.md` estão completos e acionáveis (envs, links, passos de verificação).
**Where**: `.specs/features/20260606-fix-validacao-producao/design.md` (seção Track C)
**Depends on**: None
**Reuses**: conteúdo já redigido

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Runbook 1 com link AI Studio, env `GEMINI_API_KEY`, passo de redeploy e verificação
- [x] Runbook 2 com checagem do binário, globs de tracing e fallback `COPY`

**Verify**:
Leitura cruzada com os critérios de aceite P3 da `spec.md`.

---

## Parallel Execution Map

```
Track A (Sequential):
  T1 → T2 → [T3 se necessário] → T4

Track B:
  T5 → ├── T6 [P]
       └── T7 [P]
            T6,T7 → T8 → T9

Track C:
  T10 (independente)
```

Track A ⟂ Track B (sem dependência cruzada). T10 pode ocorrer a qualquer momento.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 package.json dep | 1 arquivo | ✅ Granular |
| T2 next.config | 1 arquivo | ✅ Granular |
| T3 Dockerfile fallback | 1 arquivo (condicional) | ✅ Granular |
| T4 verificação container | 1 verificação | ✅ Granular |
| T5 GeminiQuotaError | 1 arquivo / 1 conceito | ✅ Granular |
| T6 executarComRetry | 1 função | ✅ Granular |
| T7 alerta cota | 1 trecho | ✅ Granular |
| T8 confirmar PENDENCIA | 1 verificação | ✅ Granular |
| T9 testes | 1 arquivo de testes | ✅ Granular |
| T10 runbook review | 1 doc | ✅ Granular |

---

## Tools / MCP / Skills (resumo)

Nenhuma MCP externa necessária — tudo é edição local + Docker + testes nativos.
- **Skill opcional `verify`/`run`** em T4 para subir e observar o app no container.
- Validação padrão do projeto em todas as tasks de código: `npm test` + `npx tsc --noEmit` + `npx eslint` nos arquivos tocados.
