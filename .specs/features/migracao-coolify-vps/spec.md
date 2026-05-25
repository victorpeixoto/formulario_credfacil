# Migracao para Coolify VPS Specification

## Problem Statement

O `formulario-credfacil` esta em producao na Vercel, mas precisa migrar para uma VPS Hostinger gerenciada pelo Coolify sem quebrar o fluxo de captacao, autenticacao, upload e validacao de documentos. O projeto e um Next.js full-stack com rotas `app/api/*`; a migracao deve preservar esse desenho e reduzir risco operacional no primeiro deploy.

## Goals

- [ ] Publicar o app em Coolify como um unico servico Next.js standalone, acessivel pelo dominio de producao.
- [ ] Preservar todos os fluxos existentes: formulario publico, login, upload R2, validacao IA, portal `/status`, email, Telegram, Chatwoot/WhatsApp e Meta CAPI.
- [ ] Documentar variaveis, build, start, health check, rollback e validacao manual para o deploy na VPS.
- [ ] Deixar claro quando separar worker/backend sera necessario no futuro.

## Out of Scope

- Separar frontend e backend nesta migracao inicial.
- Migrar MongoDB Atlas, Cloudflare R2, Chatwoot, n8n ou servicos de IA para a VPS.
- Criar painel administrativo ou observabilidade completa.
- Trocar o provedor de analytics nesta fase, exceto remover dependencia direta da Vercel se ela bloquear o build/deploy.

---

## User Stories

### P1: Deploy standalone no Coolify MVP

**User Story**: Como operador do projeto, quero subir o `formulario-credfacil` no Coolify em um unico container para migrar da Vercel com o menor risco possivel.

**Why P1**: Sem uma unidade de deploy reproduzivel, a migracao fica manual e dificil de reverter.

**Acceptance Criteria**:

1. WHEN o Coolify executar o build do repositorio THEN o sistema SHALL gerar uma imagem Docker funcional para Next.js standalone.
2. WHEN o container iniciar THEN o sistema SHALL escutar na porta `3000` e servir o app por `node server.js`.
3. WHEN `GET /api/health` for chamado THEN o sistema SHALL retornar HTTP 200 com metadados basicos do ambiente.
4. WHEN `npm run lint` for executado THEN o sistema SHALL concluir sem erros novos introduzidos pela migracao.

**Independent Test**: Executar build Docker local, iniciar o container e acessar `/api/health`.

---

### P1: Configuracao de ambiente segura

**User Story**: Como operador do deploy, quero uma lista completa de variaveis para configurar o app no Coolify sem expor segredos no repositorio.

**Why P1**: O app depende de MongoDB, R2, Gemini, AWS Rekognition, SMTP, Telegram, Chatwoot e Meta CAPI.

**Acceptance Criteria**:

1. WHEN um novo ambiente Coolify for criado THEN a documentacao SHALL listar todas as variaveis obrigatorias e opcionais.
2. WHEN `NEXT_PUBLIC_BASE_URL` for configurada THEN o sistema SHALL usar o dominio final sem barra no fim.
3. WHEN segredos forem documentados THEN o sistema SHALL apontar para Coolify Environment Variables, nao para arquivos versionados.

**Independent Test**: Conferir a checklist de variaveis contra `.env.example` e contra usos de `process.env` no codigo.

---

### P1: Validacao funcional pos-migracao

**User Story**: Como responsavel pela operacao, quero um roteiro de teste manual para confirmar que a migracao nao quebrou os fluxos criticos.

**Why P1**: O projeto ainda nao tem suite automatizada, entao a validacao precisa ser explicita e repetivel.

**Acceptance Criteria**:

1. WHEN o app estiver no dominio de staging/preview do Coolify THEN a checklist SHALL validar formulario, login, documentos, status e WhatsApp.
2. WHEN um erro ocorrer em servicos externos THEN a checklist SHALL indicar onde observar logs do Coolify e quais variaveis conferir.
3. WHEN o teste de producao terminar THEN o operador SHALL ter um criterio claro de go/no-go.

**Independent Test**: Executar o roteiro em staging usando um CPF de teste e registrar resultado.

---

### P2: Rollback operacional

**User Story**: Como operador, quero um plano de rollback para voltar para Vercel ou para a imagem anterior se a migracao falhar.

**Why P2**: DNS e deploy em VPS aumentam o risco de indisponibilidade se nao houver retorno rapido.

**Acceptance Criteria**:

1. WHEN o deploy no Coolify falhar THEN o plano SHALL permitir manter a Vercel como origem ativa.
2. WHEN o dominio ja tiver sido apontado para a VPS THEN o plano SHALL indicar rollback via DNS ou redeploy da imagem anterior.
3. WHEN rollback for executado THEN o sistema SHALL preservar dados no MongoDB e arquivos no R2.

**Independent Test**: Simular rollback em staging alterando dominio temporario ou redeployando a versao anterior no Coolify.

---

### P3: Preparacao para worker futuro

**User Story**: Como tech lead, quero criterios objetivos para decidir quando extrair a validacao IA para um worker separado.

**Why P3**: Separar backend agora adiciona complexidade; separar depois pode ser necessario por CPU, tempo de execucao ou concorrencia.

**Acceptance Criteria**:

1. WHEN a documentacao de deploy for lida THEN ela SHALL explicar que o app permanece monolito Next.js nesta fase.
2. WHEN latencia, memoria ou timeout passarem dos limites definidos THEN a documentacao SHALL recomendar extrair worker de validacao.
3. WHEN o worker futuro for planejado THEN o escopo SHALL manter MongoDB e R2 como contratos compartilhados.

---

## Edge Cases

- WHEN `pdf-to-img` ou dependencias nativas falharem no container THEN o build SHALL falhar cedo ou o smoke test SHALL capturar o erro antes do go-live.
- WHEN `MONGODB_URI` estiver ausente THEN `/api/health` SHALL indicar configuracao incompleta sem expor o valor da connection string.
- WHEN Coolify fizer deploy de subdiretorio errado THEN o plano SHALL indicar `formulario-credfacil` como base directory.
- WHEN DNS ainda apontar para Vercel THEN a migracao SHALL poder ser validada por dominio temporario do Coolify.
- WHEN Meta CAPI receber eventos do novo host THEN `NEXT_PUBLIC_BASE_URL` e dominio devem refletir a URL de producao.

---

## Success Criteria

- [ ] Container Next.js standalone sobe no Coolify e responde `/api/health`.
- [ ] Dominio de staging ou producao acessa o formulario com HTTPS.
- [ ] Fluxo manual E2E passa: cadastro, login, upload, validacao, portal e WhatsApp.
- [ ] Operador consegue executar rollback sem tocar em dados persistentes.
- [ ] Nenhum documento de migracao foi criado fora de `formulario-credfacil/.specs/`.
