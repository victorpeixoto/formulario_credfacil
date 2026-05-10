# Validação de Documentos com IA — Tasks

**Design**: `.specs/features/validacao-documentos-ia/design.md`
**Status**: Approved

---

## Execution Plan

### Phase 1: Foundation (Sequential)

Infraestrutura e dependências que tudo mais precisa.

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Core Services (Parallel)

Libs independentes que podem ser construídas em paralelo.

```
         ┌→ T6  (Auth Service)
         ├→ T7  (R2 Client)
T5 ──────┼→ T8  (Gemini Client)
         ├→ T9  (Rekognition Client)
         └→ T10 (Email Service)
```

### Phase 3: Validation Functions (Parallel)

Dependem dos clients da Phase 2.

```
T8 ──────┬→ T11 (validarCNH)
         ├→ T12 (validarComprovante)
         ├→ T13 (validarSelfiePlaca)
         ├→ T14 (validarVideoApp)
         └→ T15 (validarVideoVeiculo)

T9 ──────→ T16 (validarBiometria)
```

### Phase 4: API Routes (Parcialmente Parallel)

```
T6 ──────┬→ T17 (API: registrar)
         ├→ T18 (API: login)
         └→ T19 (API: recuperar + redefinir)

T7 ──────→ T20 (API: presigned-url)

T11-T16 ─→ T21 (Cruzamento validacaoIA)
T21 ─────→ T22 (API: validacao/iniciar)
T22 ─────→ T23 (API: validacao/status SSE)
```

### Phase 5: Middleware + Pages (Sequential after APIs)

```
T17-T18 ──→ T24 (Middleware auth)
T24 ──────→ T25 (Page: /login)
T17 ──────→ T26 (Page: /aprovado redesign)
T20,T24 ──→ T27 (Page: /documentos)
T23,T24 ──→ T28 (Page: /status)
T19 ──────→ T29 (Page: /redefinir-senha)
```

### Phase 6: Infrastructure + Integration (Sequential)

```
T28 ──→ T30 (Dockerfile + Coolify config)
T30 ──→ T31 (Integração reenvio de documentos)
T31 ──→ T32 (Alerta analista 3+ tentativas)
T32 ──→ T33 (Testes manuais end-to-end)
```

---

## Task Breakdown

### T1: Instalar dependências novas

**What**: Adicionar pacotes necessários ao package.json
**Where**: `package.json`
**Depends on**: None

**Packages**:
```
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-rekognition @google/generative-ai bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken
```

**Done when**:
- [x] Todos os pacotes instalados sem erro
- [x] `npm run build` compila sem erros de tipo

**Verify**: `npm ls @aws-sdk/client-s3 @google/generative-ai bcryptjs jsonwebtoken`

---

### T2: Criar tipos de documentos

**What**: Definir interfaces e types do domínio de documentos
**Where**: `types/documentos.ts`
**Depends on**: T1

**Done when**:
- [x] Tipos TipoDocumento, StatusDocumento, StatusDocumentos definidos
- [x] Interfaces DocumentoInfo, ResultadoValidacao, ValidacaoIA definidas
- [x] Interfaces de resultado por documento (ResultadoCNH, ResultadoComprovante, etc.) definidas
- [x] Exportações corretas
- [x] `npm run build` compila

**Verify**: `npx tsc --noEmit`

---

### T3: Criar tipos de autenticação

**What**: Definir interfaces de auth (JWTPayload, LoginRequest, etc.)
**Where**: `types/auth.ts`
**Depends on**: T1

**Done when**:
- [x] Interface JWTPayload { cpf: string, formCode: string, iat: number, exp: number }
- [x] Interface RegistrarRequest { cpf: string, senha: string }
- [x] Interface LoginRequest { cpf: string, senha: string }
- [x] `npm run build` compila

**Verify**: `npx tsc --noEmit`

---

### T4: Reorganizar rotas em route groups

**What**: Mover páginas existentes para (public)/ e criar estrutura (auth)/
**Where**: `app/`
**Depends on**: None

**Detalhes**:
- Mover `app/page.tsx` → `app/(public)/page.tsx`
- Mover `app/aprovado/` → `app/(public)/aprovado/`
- Mover `app/reprovado/` → `app/(public)/reprovado/`
- Mover `app/suporte-whatsapp/` → `app/(public)/suporte-whatsapp/`
- Criar `app/(public)/login/page.tsx` (placeholder)
- Criar `app/(public)/redefinir-senha/page.tsx` (placeholder)
- Criar `app/(auth)/documentos/page.tsx` (placeholder)
- Criar `app/(auth)/status/page.tsx` (placeholder)
- Criar `app/(auth)/layout.tsx` (placeholder)

**Done when**:
- [x] Todas as rotas públicas existentes funcionam nos novos paths
- [x] Route groups não alteram URLs (confirmado: /(public)/ não aparece na URL)
- [x] Placeholders criados para rotas novas
- [x] `npm run build` compila

**Verify**: `npm run build && curl http://localhost:3000/ && curl http://localhost:3000/aprovado`

---

### T5: Configurar variáveis de ambiente

**What**: Adicionar novas env vars ao .env.local.example e documentar
**Where**: `.env.local.example`
**Depends on**: None

**Variáveis**:
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=credfacil-documentos
GEMINI_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
JWT_SECRET=
EMAIL_FROM=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

**Done when**:
- [x] .env.local.example atualizado com todas as vars
- [x] Comentários explicando cada grupo

**Verify**: Verificar que o arquivo contém todas as variáveis listadas

---

### T6: Criar Auth Service [P]

**What**: Implementar funções de hash de senha, JWT e token de recuperação
**Where**: `lib/auth.ts`
**Depends on**: T3
**Reuses**: Nenhum existente

**Funções**:
- `hashSenha(senha: string): Promise<string>`
- `verificarSenha(senha: string, hash: string): Promise<boolean>`
- `gerarJWT(cpf: string, formCode: string): string`
- `verificarJWT(token: string): JWTPayload | null`
- `gerarResetToken(): { token: string, expira: Date }`

**Done when**:
- [x] Hash e verificação de senha funcionam com bcryptjs
- [x] JWT gera token válido de 7 dias com payload {cpf, formCode}
- [x] verificarJWT retorna payload válido ou null
- [x] Reset token gera string aleatória com expiração de 1h
- [x] `npm run build` compila

**Verify**: Testar manualmente via `node -e "..."` ou criar script de teste

---

### T7: Criar R2 Client [P]

**What**: Implementar client para gerar presigned URLs de upload e leitura no Cloudflare R2
**Where**: `lib/r2.ts`
**Depends on**: T2, T5
**Reuses**: Nenhum existente

**Funções**:
- `gerarPresignedUpload(formCode, tipo, ext): Promise<{ uploadUrl, fileKey }>`
- `gerarPresignedRead(fileKey): Promise<string>`
- `deletarArquivo(fileKey): Promise<void>`

**Path pattern**: `documentos/{formCode}/{tipo}_{timestamp}.{ext}`
**Upload URL**: válida por 10 minutos
**Read URL**: válida por 1 hora

**Done when**:
- [x] Presigned URL de upload gerada corretamente
- [x] Presigned URL de leitura gerada corretamente
- [x] Deletar arquivo funciona
- [x] `npm run build` compila

**Verify**: Gerar URL e testar upload manual via `curl -X PUT <url> --data-binary @arquivo.jpg`

---

### T8: Criar Gemini Client [P]

**What**: Implementar client genérico para chamadas ao Gemini Flash (imagem e vídeo)
**Where**: `lib/ai/gemini.ts`
**Depends on**: T5
**Reuses**: Nenhum existente

**Funções**:
- `analisarImagem(imageUrl: string, prompt: string): Promise<Record<string, unknown>>`
- `analisarVideo(videoUrl: string, prompt: string): Promise<Record<string, unknown>>`

**Comportamento**:
- Usar modelo `gemini-2.0-flash` (ou mais recente disponível)
- Fazer download do arquivo via URL, enviar como inline_data
- Parsear resposta JSON (extrair do markdown se necessário)
- Retry 2x com backoff de 5s em caso de 429

**Done when**:
- [x] Chamada de imagem funciona com Gemini
- [x] Chamada de vídeo funciona com Gemini
- [x] Resposta parseada como JSON
- [x] Retry implementado para 429
- [x] `npm run build` compila

**Verify**: Testar com imagem de teste e prompt simples

---

### T9: Criar Rekognition Client [P]

**What**: Implementar client para comparação facial via AWS Rekognition
**Where**: `lib/ai/rekognition.ts`
**Depends on**: T5
**Reuses**: Nenhum existente

**Funções**:
- `compararRostos(sourceUrl: string, targetUrl: string): Promise<{ similarity: number, match: boolean }>`

**Comportamento**:
- Fazer download das imagens via URL
- Enviar como Bytes para CompareFaces
- SimilarityThreshold: 80
- match = similarity >= 90

**Done when**:
- [x] Comparação retorna similarity score numérico
- [x] match true quando >= 90, false quando < 90
- [x] Trata erro quando nenhum rosto é detectado
- [x] `npm run build` compila

**Verify**: Testar com duas fotos da mesma pessoa e duas diferentes

---

### T10: Criar Email Service [P]

**What**: Implementar envio de email para recuperação de senha
**Where**: `lib/email.ts`
**Depends on**: T5
**Reuses**: Nenhum existente

**Funções**:
- `enviarEmailRecuperacao(email: string, nome: string, resetUrl: string): Promise<boolean>`

**Done when**:
- [x] Envia email via SMTP (nodemailer)
- [x] Template HTML com link de redefinição
- [x] Retorna true/false conforme sucesso
- [x] `npm run build` compila

**Verify**: Enviar email de teste para endereço real

---

### T11: Implementar validarCNH [P]

**What**: Função que envia imagem da CNH para Gemini e retorna ResultadoCNH
**Where**: `lib/ai/validacoes/cnh.ts`
**Depends on**: T2, T8
**Reuses**: `lib/ai/gemini.ts`

**Lógica**:
- Enviar prompt de CNH para Gemini
- Parsear resposta para ResultadoCNH
- Verificar: legivel == true, validade >= hoje
- Retornar ResultadoValidacao com aprovado/motivo

**Done when**:
- [x] Extrai nome, CPF, validade, categoria
- [x] Rejeita se ilegível
- [x] Rejeita se CNH vencida
- [x] Retorna ResultadoValidacao correto
- [x] `npm run build` compila

**Verify**: Testar com imagem de CNH válida e uma vencida

---

### T12: Implementar validarComprovante [P]

**What**: Função que envia imagem do comprovante para Gemini e retorna ResultadoComprovante
**Where**: `lib/ai/validacoes/comprovante.ts`
**Depends on**: T2, T8
**Reuses**: `lib/ai/gemini.ts`

**Lógica**:
- Enviar prompt de comprovante para Gemini
- Parsear resposta para ResultadoComprovante
- Verificar: legivel == true, dataEmissao <= 90 dias
- Retornar ResultadoValidacao

**Done when**:
- [x] Extrai nome, data, endereço, tipo
- [x] Rejeita se > 90 dias
- [x] Rejeita se ilegível
- [x] `npm run build` compila

**Verify**: Testar com comprovante recente e um antigo

---

### T13: Implementar validarSelfiePlaca [P]

**What**: Função que analisa selfie ao lado do veículo e extrai placa
**Where**: `lib/ai/validacoes/selfie-placa.ts`
**Depends on**: T2, T8
**Reuses**: `lib/ai/gemini.ts`

**Lógica**:
- Enviar prompt de selfie para Gemini
- Parsear resposta para ResultadoSelfie
- Verificar: pessoaVisivel, veiculoVisivel, aparentementeAutentica
- Retornar ResultadoValidacao + placa extraída

**Done when**:
- [x] Detecta pessoa e veículo
- [x] Extrai placa quando visível
- [x] Detecta foto não autêntica
- [x] `npm run build` compila

**Verify**: Testar com selfie real e uma foto editada

---

### T14: Implementar validarVideoApp [P]

**What**: Função que analisa vídeo do app e extrai dados do perfil
**Where**: `lib/ai/validacoes/video-app.ts`
**Depends on**: T2, T8
**Reuses**: `lib/ai/gemini.ts`

**Lógica**:
- Enviar vídeo para Gemini
- Parsear resposta para ResultadoVideoApp
- Verificar: temCortes == false
- Retornar ResultadoValidacao + dados extraídos

**Done when**:
- [x] Extrai nome, placa, faturamento, tempo, corridas, app
- [x] Detecta cortes
- [x] `npm run build` compila

**Verify**: Testar com vídeo de tela de app

---

### T15: Implementar validarVideoVeiculo [P]

**What**: Função que analisa vídeo do veículo e extrai dados
**Where**: `lib/ai/validacoes/video-veiculo.ts`
**Depends on**: T2, T8
**Reuses**: `lib/ai/gemini.ts`

**Lógica**:
- Enviar vídeo para Gemini
- Parsear resposta para ResultadoVideoVeiculo
- Verificar: veiculoLigado, temCortes == false
- Retornar ResultadoValidacao

**Done when**:
- [x] Detecta veículo ligado
- [x] Extrai placa
- [x] Detecta cortes
- [x] `npm run build` compila

**Verify**: Testar com vídeo de veículo

---

### T16: Implementar validarBiometria [P]

**What**: Função que compara rosto da selfie com foto da CNH via Rekognition
**Where**: `lib/ai/validacoes/biometria.ts`
**Depends on**: T2, T9
**Reuses**: `lib/ai/rekognition.ts`

**Lógica**:
- Chamar compararRostos(cnhUrl, selfieUrl)
- Se score >= 90: aprovado
- Se score 80-90: pendência (revisão humana)
- Se score < 80: rejeitado

**Done when**:
- [x] Aprovação correta para mesma pessoa
- [x] Pendência para similaridade intermediária
- [x] Rejeição para pessoas diferentes
- [x] `npm run build` compila

**Verify**: Testar com pares de fotos

---

### T17: Criar API /api/auth/registrar

**What**: Endpoint POST para cadastrar senha do candidato
**Where**: `app/api/auth/registrar/route.ts`
**Depends on**: T6
**Reuses**: `lib/auth.ts`, `lib/mongodb.ts`

**Lógica**:
- Receber { cpf, senha }
- Validar: cpf existe no MongoDB, senhaHash ainda null, senha >= 6 chars
- Hash com bcrypt, salvar senhaHash
- Atualizar statusDocumentos para "AGUARDANDO_DOCUMENTOS"
- Gerar JWT, setar cookie httpOnly `cf_token`
- Retornar { success: true }

**Done when**:
- [x] Registra senha no documento existente
- [x] Rejeita CPF inexistente (400)
- [x] Rejeita se já tem senha (409)
- [x] Seta cookie JWT httpOnly
- [x] `npm run build` compila

**Verify**: `curl -X POST /api/auth/registrar -d '{"cpf":"...", "senha":"..."}' -v` (verificar Set-Cookie)

---

### T18: Criar API /api/auth/login

**What**: Endpoint POST para login com CPF + senha
**Where**: `app/api/auth/login/route.ts`
**Depends on**: T6
**Reuses**: `lib/auth.ts`, `lib/mongodb.ts`

**Lógica**:
- Receber { cpf, senha }
- Buscar por CPF, verificar senha com bcrypt
- Implementar rate limit: 5 tentativas, bloqueio 15min
- Gerar JWT, setar cookie
- Retornar { success: true, formCode }

**Done when**:
- [x] Login correto gera JWT e seta cookie
- [x] Senha errada retorna 401
- [x] 5 tentativas erradas bloqueia por 15min (429)
- [x] `npm run build` compila

**Verify**: `curl -X POST /api/auth/login -d '{"cpf":"...", "senha":"..."}' -v`

---

### T19: Criar APIs /api/auth/recuperar e /api/auth/redefinir

**What**: Endpoints para fluxo de recuperação de senha
**Where**: `app/api/auth/recuperar/route.ts` e `app/api/auth/redefinir/route.ts`
**Depends on**: T6, T10
**Reuses**: `lib/auth.ts`, `lib/email.ts`, `lib/mongodb.ts`

**Lógica recuperar**:
- Receber { cpf }
- Buscar email do candidato
- Gerar resetToken (1h), salvar no MongoDB
- Enviar email com link

**Lógica redefinir**:
- Receber { token, novaSenha }
- Validar token (existe, não expirado)
- Hash nova senha, salvar, limpar token

**Done when**:
- [x] Email de recuperação enviado com link correto
- [x] Token válido permite redefinir senha
- [x] Token expirado retorna 400
- [x] Token já usado retorna 400
- [x] `npm run build` compila

**Verify**: Fluxo completo: recuperar → email → redefinir → login com nova senha

---

### T20: Criar API /api/upload/presigned-url

**What**: Endpoint GET para gerar presigned URL de upload no R2
**Where**: `app/api/upload/presigned-url/route.ts`
**Depends on**: T7, T6 (precisa de auth)
**Reuses**: `lib/r2.ts`

**Lógica**:
- Verificar JWT do cookie
- Receber query params: tipo (TipoDocumento), ext (jpg/png/pdf/mp4/mov)
- Validar tipo e extensão permitidos
- Gerar presigned URL com path `documentos/{formCode}/{tipo}_{timestamp}.{ext}`
- Retornar { uploadUrl, fileKey }

**Done when**:
- [x] Gera URL válida para upload
- [x] Rejeita tipo/extensão inválidos (400)
- [x] Rejeita sem autenticação (401)
- [x] `npm run build` compila

**Verify**: `curl -H "Cookie: cf_token=..." "/api/upload/presigned-url?tipo=cnh&ext=jpg"`

---

### T21: Implementar cruzamento validacaoIA

**What**: Função que cruza dados entre resultados de todas as validações
**Where**: `lib/ai/cruzamento.ts`
**Depends on**: T11-T16
**Reuses**: Nenhum existente

**Funções**:
- `cruzarDados(resultados, cpfFormulario): ValidacaoIA`
- `calcularSimilaridade(str1, str2): number` (Levenshtein normalizado)

**Lógica**:
- nomeConfere: Levenshtein(CNH.nome, videoApp.nomePerfil) >= 85
- cpfConfere: CNH.cpf === cpfFormulario
- placaConfere: >= 2 de 3 placas iguais (selfie, videoApp, videoVeiculo)
- biometriaConfere: score >= 90

**Done when**:
- [x] Nomes similares (>= 85%) são aprovados
- [x] Nomes muito diferentes são rejeitados
- [x] CPFs iguais aprovam, diferentes rejeitam
- [x] Placas 2/3 iguais aprovam
- [x] Biometria usa threshold correto
- [x] `npm run build` compila

**Verify**: Testar com dados mock (nomes com/sem acento, placas iguais/diferentes)

---

### T22: Criar API /api/validacao/iniciar

**What**: Endpoint POST que salva URLs no MongoDB e dispara pipeline de validação
**Where**: `app/api/validacao/iniciar/route.ts`
**Depends on**: T21, T11-T16
**Reuses**: `lib/mongodb.ts`, todas as funções de validação

**Lógica**:
1. Verificar JWT
2. Buscar documento do candidato por formCode
3. Salvar URLs dos documentos no MongoDB (status: "processando")
4. Disparar Promise.allSettled com as 6 validações
5. A cada validação concluída: atualizar MongoDB com resultado
6. Após todas: executar cruzamento, atualizar validacaoIA e statusDocumentos
7. Se algum rejeitado: statusDocumentos = "PENDENCIA"
8. Se todos aprovados + cruzamento ok: statusDocumentos = "APROVADO"
9. Retornar { status: "processando" }

**Importante**: O processamento continua em background após o response. Usar pattern de "fire and forget" com error handling.

**Done when**:
- [x] Salva URLs no MongoDB corretamente
- [x] Todas as 6 validações são disparadas em paralelo
- [x] Resultados individuais atualizados no MongoDB
- [x] Cruzamento executado após validações
- [x] statusDocumentos atualizado corretamente
- [x] `npm run build` compila

**Verify**: POST com URLs de teste, verificar MongoDB após processamento

---

### T23: Criar API /api/validacao/status (SSE)

**What**: Endpoint GET que envia Server-Sent Events com progresso da validação
**Where**: `app/api/validacao/status/route.ts`
**Depends on**: T22
**Reuses**: `lib/mongodb.ts`

**Lógica**:
- Verificar JWT
- Abrir stream SSE (ReadableStream com headers text/event-stream)
- Polling MongoDB a cada 2s para verificar mudanças nos documentos
- A cada mudança: enviar evento com tipo, status, resultado
- Quando statusDocumentos != "PROCESSANDO": enviar evento "concluido" e fechar

**Eventos**:
```
event: documento
data: {"tipo":"cnh","status":"aprovado","resultado":{...}}

event: concluido
data: {"statusFinal":"APROVADO","validacaoIA":{...}}
```

**Done when**:
- [x] SSE stream abre corretamente
- [x] Eventos enviados conforme documentos mudam de status
- [x] Evento "concluido" enviado ao final
- [x] Stream fecha após conclusão
- [x] `npm run build` compila

**Verify**: `curl -N -H "Cookie: cf_token=..." "/api/validacao/status?formCode=..."`

---

### T24: Criar middleware de autenticação

**What**: Next.js middleware que protege rotas /(auth)/*
**Where**: `middleware.ts`
**Depends on**: T6
**Reuses**: `lib/auth.ts`

**Lógica**:
- Matcher: `/(auth)/:path*`
- Ler cookie `cf_token`
- Verificar JWT com `verificarJWT()`
- Se válido: prosseguir, adicionar `x-user-cpf` e `x-user-formcode` nos headers
- Se inválido: redirect /login

**Done when**:
- [x] Rotas /(auth)/* redirecionam para /login sem cookie
- [x] Rotas /(auth)/* funcionam com cookie válido
- [x] Headers x-user-cpf e x-user-formcode presentes
- [x] Rotas /(public)/* não são afetadas
- [x] `npm run build` compila

**Verify**: Acessar /documentos sem cookie → redirect. Com cookie → acessa.

---

### T25: Criar página /login

**What**: Página de login com CPF + senha
**Where**: `app/(public)/login/page.tsx`
**Depends on**: T18, T24
**Reuses**: Padrão visual do formulário existente (Tailwind, fonte, cores)

**UI**:
- Input CPF (com máscara)
- Input senha
- Botão "Entrar"
- Link "Esqueci minha senha"
- Link "Não tem conta? Preencha o formulário"
- Mensagens de erro (senha incorreta, conta bloqueada)

**Done when**:
- [x] Login funcional com redirect para /documentos
- [x] Exibe erros de validação
- [x] Link para recuperação funciona
- [x] Visual consistente com o formulário
- [x] `npm run build` compila

**Verify**: Login com credenciais válidas → redirect /documentos

---

### T26: Redesign página /aprovado

**What**: Adicionar formulário de cadastro de senha na tela de aprovado
**Where**: `app/(public)/aprovado/page.tsx`
**Depends on**: T17
**Reuses**: Componente existente de aprovado (adaptar)

**Mudanças**:
- Manter exibição do código (formCode)
- Remover botão WhatsApp direto (agora só aparece após docs aprovados)
- Adicionar campos: Senha + Confirmar Senha
- Botão "Criar conta e continuar"
- POST /api/auth/registrar → auto-login → redirect /documentos

**Done when**:
- [x] Campos de senha exibidos
- [x] Validação client-side (mín 6 chars, senhas coincidem)
- [x] POST para registrar funciona
- [x] Auto-login com redirect para /documentos
- [x] `npm run build` compila

**Verify**: Completar formulário → tela aprovado → cadastrar senha → /documentos

---

### T27: Criar página /documentos

**What**: Interface de upload dos 5 documentos
**Where**: `app/(auth)/documentos/page.tsx`
**Depends on**: T20, T24
**Reuses**: `CardWrapper`, `BotaoAvancar`, padrão visual

**UI**:
- Header: "Envie seus documentos"
- 5 slots de upload (CNH, Comprovante, Selfie+Veículo, Vídeo App, Vídeo Veículo)
- Cada slot: label, instrução, botão "Selecionar arquivo", preview após upload, indicador de progresso
- Validação client-side: formato + tamanho
- Botão "Enviar para análise" (habilitado quando 5/5 enviados)
- Se statusDocumentos == "PENDENCIA": mostrar apenas docs rejeitados com motivo
- Se statusDocumentos == "APROVADO": redirect para /status

**Done when**:
- [x] 5 slots de upload renderizam
- [x] Upload via presigned URL funciona para cada tipo
- [x] Preview de imagem após upload
- [x] Validação de formato e tamanho
- [x] Botão habilitado apenas com 5/5
- [x] POST /api/validacao/iniciar ao clicar
- [x] Redirect para /status após iniciar
- [x] `npm run build` compila

**Verify**: Upload de 5 arquivos de teste → botão habilita → clique → redirect /status

---

### T28: Criar página /status

**What**: Página de progresso em tempo real via SSE
**Where**: `app/(auth)/status/page.tsx`
**Depends on**: T23, T24
**Reuses**: `ProgressBar` (adaptada)

**UI**:
- "Analisando seus documentos..."
- 6 linhas de status (CNH, Comprovante, Biometria, Placa, Vídeo App, Vídeo Veículo)
- Estados visuais: ○ Aguardando, ⏳ Analisando, ✓ Aprovado, ✗ Rejeitado
- Conecta SSE em /api/validacao/status
- Atualiza cada linha conforme eventos chegam
- Resultado final:
  - APROVADO: exibe botão WhatsApp (reutiliza getAvailableWhatsAppNumber)
  - PENDENCIA: exibe motivos + botão "Corrigir documentos" → /documentos
  - ANALISE_MANUAL: "Em análise pela equipe"
- Reconexão automática se SSE cair

**Done when**:
- [x] SSE conecta e recebe eventos
- [x] UI atualiza em tempo real
- [x] Resultado final exibido corretamente
- [x] Botão WhatsApp funciona (rodízio de números)
- [x] Reconexão automática
- [x] `npm run build` compila

**Verify**: Iniciar validação → abrir /status → ver progresso → resultado final

---

### T29: Criar página /redefinir-senha

**What**: Página para redefinir senha via token do email
**Where**: `app/(public)/redefinir-senha/page.tsx`
**Depends on**: T19
**Reuses**: Padrão visual do login

**UI**:
- Input: Nova senha + Confirmar
- Botão "Redefinir"
- Token lido da query string
- POST /api/auth/redefinir
- Sucesso: redirect /login com mensagem "Senha redefinida com sucesso"

**Done when**:
- [x] Formulário exibido com token válido
- [x] Redefinição funciona
- [x] Token inválido/expirado mostra erro
- [x] `npm run build` compila

**Verify**: Usar token de teste → redefinir → login com nova senha

---

### T30: Criar Dockerfile e configurar Coolify

**What**: Dockerfile de produção e configuração para deploy no Coolify
**Where**: `Dockerfile` (raiz)
**Depends on**: T28

**Dockerfile**:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**next.config.ts**: adicionar `output: 'standalone'`

**Done when**:
- [x] Docker build completa sem erros
- [x] Container inicia e serve na porta 3000
- [x] Todas as rotas funcionam dentro do container
- [x] Conexão com MongoDB via rede interna Docker funciona
- [x] `docker build -t formulario-credfacil .` completa

**Verify**: `docker run -p 3000:3000 --env-file .env.local formulario-credfacil`

---

### T31: Implementar reenvio de documentos

**What**: Lógica de reenvio de documento individual rejeitado
**Where**: Modificar `app/(auth)/documentos/page.tsx` + `app/api/validacao/iniciar/route.ts`
**Depends on**: T27, T22

**Lógica**:
- Quando statusDocumentos == "PENDENCIA", /documentos mostra apenas docs rejeitados
- Candidato faz novo upload (novo path no R2)
- POST /api/validacao/iniciar com flag `reenvio: true` e apenas o(s) documento(s) a revalidar
- Incrementar tentativas no MongoDB
- Após validação: reexecutar cruzamento com resultados atualizados

**Done when**:
- [x] Apenas documentos rejeitados são mostrados para reenvio
- [x] Novo upload gera novo path no R2
- [x] Validação individual funciona (sem reprocessar os já aprovados)
- [x] Cruzamento reexecutado
- [x] Contador de tentativas incrementa
- [x] `npm run build` compila

**Verify**: Rejeitar documento → reenviar → verificar tentativas incrementaram

---

### T32: Implementar alerta analista após 3 tentativas

**What**: Lógica de escalação para análise manual quando tentativas >= 3
**Where**: Modificar `app/api/validacao/iniciar/route.ts`
**Depends on**: T31
**Reuses**: `lib/telegram-alert.ts`

**Lógica**:
- Após validação de reenvio, verificar se algum documento tem tentativas >= 3 e status "rejeitado"
- Se sim: statusDocumentos = "ANALISE_MANUAL", analistaAlertado = true
- Enviar alerta Telegram com formCode, CPF, documento(s) problemático(s)

**Done when**:
- [x] Status muda para ANALISE_MANUAL após 3 tentativas
- [x] Alerta Telegram enviado com dados corretos
- [x] analistaAlertado = true no MongoDB
- [x] Candidato vê mensagem "Em análise pela equipe"
- [x] `npm run build` compila

**Verify**: Simular 3 rejeições → verificar Telegram recebeu alerta

---

### T33: Testes manuais end-to-end

**What**: Validar fluxo completo do início ao fim
**Where**: N/A (teste manual)
**Depends on**: T30, T31, T32

**Cenários de teste**:
1. Fluxo feliz: formulário → senha → upload 5 docs válidos → aprovação → WhatsApp
2. Documento rejeitado: upload com CNH vencida → pendência → reenvio inline no portal → aprovação
3. 3 tentativas: rejeição 3x → alerta analista → "Em análise"
4. Login retorno: fechar browser → login → portal /status (não /documentos)
5. Recuperação de senha: esqueci → email → redefinir → login
6. Browser fecha durante validação: reabrir → /status mostra resultado
7. Validações client-side: arquivo muito grande, formato errado
8. Camera celular: reenvio de CNH e comprovante via câmera nativa no celular

**Done when**:
- [ ] Todos os 8 cenários passam no celular real (não simulador)
- [ ] Nenhum erro no console do servidor
- [ ] Dados corretos no MongoDB após cada cenário

**Verify**: Executar cada cenário manualmente via Vercel Preview no celular

---

### T34: Portal do Cliente (reenvio individual inline)

**What**: Transformar /status de página de progresso em portal central do candidato com reenvio granular
**Where**: `app/(auth)/status/page.tsx`, `components/portal/*`, `app/api/candidato/route.ts`
**Depends on**: T28, T31

**Implementado em**: commit `afeabc8` (2026-05-10)

**O que foi feito**:
- `GET /api/candidato` — retorna nome, CPF mascarado, statusDocumentos, documentos com status/motivo/tentativas
- `components/portal/card-documento.tsx` — card visual com badge (Aprovado/Rejeitado/Analisando/Erro), motivo de rejeição, animação pulse
- `components/portal/reenvio-documento.tsx` — reutiliza CapturaDocumento/CapturaSelfie/CapturaVideo, faz upload + chama iniciar com reenvio:true
- `components/portal/secao-contato.tsx` — seção WhatsApp exibida apenas quando statusDocumentos === 'APROVADO'
- `/status` reescrita: saudação personalizada, barra de progresso, 5 cards, SSE em tempo real, reenvio inline

**Done when**:
- [x] GET /api/candidato retorna dados corretos do MongoDB
- [x] Cards exibem status correto para cada documento
- [x] Reenvio inline funciona sem sair da página
- [x] SSE atualiza cards em tempo real durante reprocessamento
- [x] Seção WhatsApp aparece apenas quando todos aprovados
- [x] TypeScript compila sem erros

**Verify**: Acessar /status com documentos em diferentes estados e verificar UI

---

### T35: Redirect inteligente (login + wizard)

**What**: Garantir que candidatos com documentos enviados sejam sempre redirecionados para o portal
**Where**: `app/api/auth/login/route.ts`, `app/(public)/login/page.tsx`, `app/(auth)/documentos/page.tsx`
**Depends on**: T34

**Implementado em**: commit `afeabc8` (2026-05-10)

**O que foi feito**:
- `POST /api/auth/login` — retorna `temDocumentos: boolean` (true quando statusDocumentos != 'AGUARDANDO_DOCUMENTOS')
- `app/(public)/login/page.tsx` — redireciona para /status quando temDocumentos, para /documentos caso contrário
- `app/(auth)/documentos/page.tsx` — verifica statusDocumentos via /api/candidato no mount; redireciona para /status se não está aguardando

**Done when**:
- [x] Login redireciona para portal quando candidato já tem documentos
- [x] Login redireciona para wizard quando candidato é novo
- [x] Acesso direto a /documentos por candidato com docs enviados → redirect /status
- [x] Primeiro acesso a /documentos funciona normalmente
- [x] TypeScript compila sem erros

**Verify**: Login com contas em diferentes estados, verificar destino do redirect

---


## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 → T2 → T3 → T4 → T5

Phase 2 (Parallel):
  T5 complete, then:
    ├── T6  [P] Auth Service
    ├── T7  [P] R2 Client
    ├── T8  [P] Gemini Client
    ├── T9  [P] Rekognition Client
    └── T10 [P] Email Service

Phase 3 (Parallel):
  T8 complete, then:
    ├── T11 [P] validarCNH
    ├── T12 [P] validarComprovante
    ├── T13 [P] validarSelfiePlaca
    ├── T14 [P] validarVideoApp
    └── T15 [P] validarVideoVeiculo
  T9 complete, then:
    └── T16 [P] validarBiometria

Phase 4 (Partially Parallel):
  T6 complete:
    ├── T17 [P] API registrar
    ├── T18 [P] API login
    └── T19 [P] API recuperar/redefinir
  T7 complete:
    └── T20     API presigned-url
  T11-T16 complete:
    └── T21     Cruzamento
  T21 complete:
    └── T22     API iniciar
  T22 complete:
    └── T23     API status SSE

Phase 5 (Sequential after APIs):
  T17-T18 → T24 (middleware)
  T24 ────→ T25 (login page)
  T17 ────→ T26 (aprovado redesign)
  T20+T24 → T27 (documentos page)
  T23+T24 → T28 (status page)
  T19 ────→ T29 (redefinir-senha page)

Phase 6 (Sequential):
  T28 → T30 (Dockerfile)
  T30 → T31 (reenvio)
  T31 → T32 (alerta analista)
  T32 → T34 (portal do cliente)
  T34 → T35 (redirect inteligente)
  T35 → T33 (testes E2E)
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Instalar dependências | 1 command | ✅ Granular |
| T2: Tipos documentos | 1 file | ✅ Granular |
| T3: Tipos auth | 1 file | ✅ Granular |
| T4: Route groups | Reorganização de diretórios | ⚠️ OK (coeso) |
| T5: Env vars | 1 file | ✅ Granular |
| T6: Auth service | 1 file, 5 funções coesas | ⚠️ OK (mesmo domínio) |
| T7: R2 client | 1 file, 3 funções coesas | ✅ Granular |
| T8: Gemini client | 1 file, 2 funções | ✅ Granular |
| T9: Rekognition client | 1 file, 1 função | ✅ Granular |
| T10: Email service | 1 file, 1 função | ✅ Granular |
| T11-T16: Validações | 1 file cada | ✅ Granular |
| T17-T20: API routes | 1 endpoint cada | ✅ Granular |
| T21: Cruzamento | 1 file, 2 funções | ✅ Granular |
| T22-T23: API validação | 1 endpoint cada | ✅ Granular |
| T24: Middleware | 1 file | ✅ Granular |
| T25-T29: Pages | 1 page cada | ✅ Granular |
| T30: Dockerfile | 1 file + config | ✅ Granular |
| T31: Reenvio | Modificação em 2 files | ⚠️ OK (feature coesa) |
| T32: Alerta | Modificação em 1 file | ✅ Granular |
| T33: Testes E2E | Manual — celular real | ⏳ Pendente |
| T34: Portal do Cliente | 4 files novos + 1 reescrito | ✅ COMPLETE |
| T35: Redirect inteligente | 3 files modificados | ✅ COMPLETE |
