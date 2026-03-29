# Validação de Documentos com IA — Demandas Completas

**Feature**: `.specs/features/validacao-documentos-ia/`
**Criado em**: 2026-03-28
**Total de demandas**: 52

---

## Como usar este documento

Cada demanda tem:
- **Tipo**: `MANUAL` (humano), `INFRA` (infra/DevOps), `DEV` (desenvolvimento)
- **Responsável sugerido**: quem deveria executar
- **Bloqueia**: quais demandas dependem desta
- **Depende de**: o que precisa estar pronto antes

---

## FASE 0 — Contas e Acessos Externos

Tudo que precisa ser feito fora do código. **Bloqueia a Phase 2 do desenvolvimento.**

---

### D01: Criar conta Google Cloud Platform

**Tipo**: MANUAL
**Responsável**: Administrador / Dono do projeto
**Depende de**: Nada
**Bloqueia**: D02

**O que fazer**:
1. Acessar https://console.cloud.google.com/
2. Criar conta (ou usar conta Google existente)
3. Criar novo projeto: `credfacil-validacao`
4. Ativar billing (necessário para usar APIs — tem free tier generoso)

**Observações**:
- Gemini Flash tem free tier: 15 requests/min, 1M tokens/dia gratuitos
- Após free tier: ~US$0,075 por 1M tokens de input

---

### D02: Habilitar API Gemini e gerar API Key

**Tipo**: MANUAL
**Responsável**: Administrador / Dono do projeto
**Depende de**: D01
**Bloqueia**: D22 (Gemini Client), D31 (Deploy Coolify)

**O que fazer**:
1. No Google Cloud Console → APIs & Services → Library
2. Buscar "Generative Language API" (Gemini)
3. Habilitar a API
4. Ir em APIs & Services → Credentials
5. Criar API Key
6. (Recomendado) Restringir a key apenas para "Generative Language API"
7. Anotar: `GEMINI_API_KEY=AIza...`

**Testar**:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Diga olá"}]}]}'
```

---

### D03: Criar conta AWS

**Tipo**: MANUAL
**Responsável**: Administrador / Dono do projeto
**Depende de**: Nada
**Bloqueia**: D04

**O que fazer**:
1. Acessar https://aws.amazon.com/
2. Criar conta (precisa de cartão de crédito)
3. Selecionar plano Free Tier
4. Confirmar email e telefone

**Observações**:
- Rekognition Free Tier: 5.000 imagens/mês grátis por 12 meses
- Após free tier: US$0,001 por comparação facial

---

### D04: Criar usuário IAM e habilitar Rekognition

**Tipo**: MANUAL
**Responsável**: Administrador / Dono do projeto
**Depende de**: D03
**Bloqueia**: D23 (Rekognition Client), D31 (Deploy Coolify)

**O que fazer**:
1. AWS Console → IAM → Users → Create User
2. Nome: `credfacil-rekognition`
3. Attach policy: `AmazonRekognitionFullAccess`
4. Criar Access Key (tipo: "Application running outside AWS")
5. Anotar:
   - `AWS_ACCESS_KEY_ID=AKIA...`
   - `AWS_SECRET_ACCESS_KEY=...`
   - `AWS_REGION=us-east-1`

**Testar**:
```bash
aws rekognition detect-faces --image '{"Bytes":"..."}' --region us-east-1
```

**Segurança**:
- NÃO usar root account para gerar keys
- Criar usuário IAM específico com permissão mínima
- Habilitar MFA na root account

---

### D05: Criar conta Cloudflare (se não tiver)

**Tipo**: MANUAL
**Responsável**: Administrador / Dono do projeto
**Depende de**: Nada
**Bloqueia**: D06

**O que fazer**:
1. Acessar https://dash.cloudflare.com/sign-up
2. Criar conta gratuita
3. (Se já tem conta para DNS/domínio, pular)

---

### D06: Criar bucket R2 e gerar API Token

**Tipo**: MANUAL
**Responsável**: Administrador / Dono do projeto
**Depende de**: D05
**Bloqueia**: D21 (R2 Client), D31 (Deploy Coolify)

**O que fazer**:
1. Cloudflare Dashboard → R2 → Create Bucket
2. Nome: `credfacil-documentos`
3. Região: Automatic
4. Ir em R2 → Manage R2 API Tokens → Create API Token
5. Permissions: Object Read & Write
6. Especificar bucket: `credfacil-documentos`
7. Anotar:
   - `R2_ACCOUNT_ID=` (visível no dashboard R2)
   - `R2_ACCESS_KEY_ID=`
   - `R2_SECRET_ACCESS_KEY=`
   - `R2_BUCKET_NAME=credfacil-documentos`

**Configurar lifecycle (opcional mas recomendado)**:
1. Bucket → Settings → Object lifecycle rules
2. Adicionar regra: deletar objetos após 90 dias

**Custo**:
- Free: 10GB storage + 10M operações classe A + 1M classe B por mês
- Além disso: US$0,015/GB/mês

---

### D07: Configurar serviço de email (SMTP)

**Tipo**: MANUAL
**Responsável**: Administrador / Dono do projeto
**Depende de**: Nada
**Bloqueia**: D24 (Email Service), D31 (Deploy Coolify)

**Opções** (escolher uma):

**Opção A — Resend (recomendado para simplicidade)**:
1. Criar conta em https://resend.com
2. Verificar domínio (DNS TXT + DKIM)
3. Gerar API Key
4. Anotar: `RESEND_API_KEY=re_...`

**Opção B — SMTP genérico (Gmail, Zoho, etc.)**:
1. Configurar app password ou SMTP credentials
2. Anotar:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=email@dominio.com`
   - `SMTP_PASS=app_password`
   - `EMAIL_FROM=Credfácil <noreply@credfacil.com.br>`

**Opção C — Mailgun/SendGrid**:
1. Criar conta, verificar domínio
2. Gerar API Key ou SMTP credentials

**Testar**: Enviar email de teste via curl ou script

---

### D08: Definir domínio para o formulário na VPS

**Tipo**: MANUAL
**Responsável**: Administrador / Dono do projeto
**Depende de**: Nada
**Bloqueia**: D15 (Configurar Coolify)

**O que fazer**:
1. Decidir subdomínio: ex. `formulario.credfacil.com.br` ou `app.credfacil.com.br`
2. No painel DNS (Cloudflare, Registro.br, etc.):
   - Criar registro A apontando para o IP da VPS Hostinger
   - Ou CNAME se usar proxy Cloudflare
3. Aguardar propagação DNS

**Anotar**: domínio escolhido para usar no Coolify

---

### D09: Gerar JWT_SECRET

**Tipo**: MANUAL
**Responsável**: Qualquer pessoa com acesso ao terminal
**Depende de**: Nada
**Bloqueia**: D31 (Deploy Coolify)

**O que fazer**:
```bash
openssl rand -base64 32
```

**Anotar**: `JWT_SECRET=<resultado do comando>`

**Importante**: Guardar em local seguro. Se perder, todos os candidatos logados perdem a sessão.

---

## FASE 1 — Infraestrutura VPS

Preparar o ambiente de deploy na VPS antes de qualquer código.

---

### D10: Verificar recursos disponíveis na VPS

**Tipo**: INFRA
**Responsável**: DevOps / Administrador
**Depende de**: Nada
**Bloqueia**: D15

**O que fazer**:
1. Conectar via SSH na VPS
2. Verificar recursos:
   ```bash
   free -h          # RAM disponível (precisa ~500MB livres)
   df -h            # Disco disponível
   docker ps        # Containers rodando
   docker stats     # Consumo atual de cada container
   ```
3. Verificar versão do Coolify e Docker
4. Documentar consumo atual dos serviços (n8n, MongoDB, Redis, Chatwoot)

**Resultado esperado**: Confirmação de que há recursos para mais um container

---

### D11: Verificar conectividade MongoDB interna

**Tipo**: INFRA
**Responsável**: DevOps / Administrador
**Depende de**: D10
**Bloqueia**: D15

**O que fazer**:
1. Identificar o nome do container/network do MongoDB no Coolify
2. Verificar qual URI o n8n e Chatwoot usam para se conectar
3. Testar conexão interna:
   ```bash
   docker exec -it <mongo_container> mongosh --eval "db.stats()"
   ```
4. Anotar a URI interna: ex. `mongodb://mongo:27017/credfacil` ou com auth

**Resultado**: URI do MongoDB que o formulário vai usar internamente

---

### D12: Verificar network Docker do Coolify

**Tipo**: INFRA
**Responsável**: DevOps / Administrador
**Depende de**: D10
**Bloqueia**: D15

**O que fazer**:
1. Listar networks:
   ```bash
   docker network ls
   ```
2. Identificar a network que conecta os serviços (MongoDB, n8n, Chatwoot)
3. Anotar o nome da network para configurar o novo serviço

**Resultado**: Nome da network Docker compartilhada

---

### D13: Verificar se Chatwoot API é acessível internamente

**Tipo**: INFRA
**Responsável**: DevOps / Administrador
**Depende de**: D10
**Bloqueia**: D15

**O que fazer**:
1. Identificar URL interna do Chatwoot (ex. `http://chatwoot:3000`)
2. Testar de dentro de outro container:
   ```bash
   docker exec -it <qualquer_container> curl http://chatwoot:3000/api/v1/...
   ```
3. Anotar `CHATWOOT_API_URL` interna

**Resultado**: URL interna do Chatwoot confirmada

---

### D14: Criar repositório GitHub (se necessário)

**Tipo**: MANUAL
**Responsável**: Desenvolvedor / Administrador
**Depende de**: Nada
**Bloqueia**: D15

**O que fazer**:
1. Verificar se `formulario-credfacil` já tem repo no GitHub
2. Se não: criar repositório privado
3. Configurar acesso do Coolify ao repo (SSH key ou GitHub App)
4. Push do código atual para o repo

---

### D15: Configurar novo serviço no Coolify

**Tipo**: INFRA
**Responsável**: DevOps / Administrador
**Depende de**: D08, D10, D11, D12, D13, D14
**Bloqueia**: D31 (Deploy final)

**O que fazer**:
1. Coolify Dashboard → New Resource → Application
2. Source: GitHub → repositório `formulario-credfacil`
3. Build: Dockerfile (na raiz do repo)
4. Port: 3000
5. Domain: domínio definido em D08
6. Network: mesma network dos outros serviços (D12)
7. Environment variables: adicionar TODAS (D02, D04, D06, D07, D09, D11)
8. Health check: `GET /` → 200
9. Deployment: automático via push na branch `main`

**NÃO FAZER deploy ainda** — o Dockerfile será criado na D44.

---

## FASE 2 — Foundation (Código)

Setup inicial do projeto. **Sequencial.**

---

### D16: Instalar dependências novas

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: Nada
**Bloqueia**: D17, D18, D19, D20

**O que fazer**:
```bash
cd formulario-credfacil
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-rekognition @google/generative-ai bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken
```

**Verificar**: `npm run build` compila sem erros

---

### D17: Criar tipos de documentos

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D16
**Bloqueia**: D21-D30

**Arquivo**: `types/documentos.ts`

**Conteúdo**: Todos os types e interfaces definidos no design.md:
- `TipoDocumento`, `StatusDocumento`, `StatusDocumentos`
- `DocumentoInfo`, `ResultadoValidacao`, `ValidacaoIA`, `DocumentosMap`
- `ResultadoCNH`, `ResultadoComprovante`, `ResultadoSelfie`, `ResultadoBiometria`, `ResultadoVideoApp`, `ResultadoVideoVeiculo`

**Verificar**: `npx tsc --noEmit`

---

### D18: Criar tipos de autenticação

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D16
**Bloqueia**: D20

**Arquivo**: `types/auth.ts`

**Conteúdo**:
- `JWTPayload { cpf, formCode, iat, exp }`
- `RegistrarRequest { cpf, senha }`
- `LoginRequest { cpf, senha }`
- `RecuperarRequest { cpf }`
- `RedefinirRequest { token, novaSenha }`

**Verificar**: `npx tsc --noEmit`

---

### D19: Reorganizar rotas em route groups

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: Nada
**Bloqueia**: D39-D43

**O que fazer**:
- Mover `app/page.tsx` → `app/(public)/page.tsx`
- Mover `app/aprovado/` → `app/(public)/aprovado/`
- Mover `app/reprovado/` → `app/(public)/reprovado/`
- Mover `app/suporte-whatsapp/` → `app/(public)/suporte-whatsapp/`
- Criar placeholders:
  - `app/(public)/login/page.tsx`
  - `app/(public)/redefinir-senha/page.tsx`
  - `app/(auth)/layout.tsx`
  - `app/(auth)/documentos/page.tsx`
  - `app/(auth)/status/page.tsx`

**Importante**: Route groups `(public)` e `(auth)` NÃO alteram as URLs. `/aprovado` continua sendo `/aprovado`.

**Verificar**: `npm run build` + testar que `/`, `/aprovado`, `/reprovado` ainda funcionam

---

### D20: Atualizar .env.local.example com todas as variáveis

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: Nada
**Bloqueia**: D31

**Arquivo**: `.env.local.example`

**Conteúdo completo**:
```bash
# === MongoDB (já existente) ===
MONGODB_URI=mongodb://mongo:27017/credfacil

# === Chatwoot (já existente) ===
CHATWOOT_API_URL=
CHATWOOT_API_TOKEN=

# === Meta (já existente) ===
META_ACCESS_TOKEN=
META_PIXEL_ID=

# === Telegram (já existente) ===
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# === Cloudflare R2 (novo) ===
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=credfacil-documentos

# === Google Gemini (novo) ===
GEMINI_API_KEY=

# === AWS Rekognition (novo) ===
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

# === Autenticação (novo) ===
JWT_SECRET=

# === Email - SMTP (novo) ===
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=Credfácil <noreply@credfacil.com.br>
```

---

## FASE 3 — Core Services (Código)

Libs independentes. **Podem ser feitas em paralelo.**

---

### D21: Criar R2 Client

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D17, D06 (bucket R2 criado)
**Bloqueia**: D34

**Arquivo**: `lib/r2.ts`

**Funções**:
- `gerarPresignedUpload(formCode, tipo, ext)` → URL PUT válida 10min
- `gerarPresignedRead(fileKey)` → URL GET válida 1h
- `deletarArquivo(fileKey)` → limpa arquivo anterior

**Path**: `documentos/{formCode}/{tipo}_{timestamp}.{ext}`

**Verificar**: Gerar URL + upload manual via curl

---

### D22: Criar Gemini Client

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D02 (API Key Gemini)
**Bloqueia**: D25, D26, D27, D28, D29

**Arquivo**: `lib/ai/gemini.ts`

**Funções**:
- `analisarImagem(imageUrl, prompt)` → JSON parseado
- `analisarVideo(videoUrl, prompt)` → JSON parseado

**Comportamento**:
- Modelo: `gemini-2.0-flash`
- Download do arquivo via URL → enviar como inline_data
- Parsear JSON da resposta (extrair de markdown code block se necessário)
- Retry 2x com backoff 5s para erro 429

**Verificar**: Testar com imagem de teste + prompt simples

---

### D23: Criar Rekognition Client

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D04 (credenciais AWS)
**Bloqueia**: D30

**Arquivo**: `lib/ai/rekognition.ts`

**Funções**:
- `compararRostos(sourceUrl, targetUrl)` → `{ similarity, match }`

**Comportamento**:
- Download das imagens → enviar como Bytes
- SimilarityThreshold: 80
- match = similarity >= 90

**Verificar**: Testar com fotos da mesma pessoa e de pessoas diferentes

---

### D24: Criar Email Service

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D07 (SMTP configurado)
**Bloqueia**: D33

**Arquivo**: `lib/email.ts`

**Funções**:
- `enviarEmailRecuperacao(email, nome, resetUrl)` → boolean

**Conteúdo do email**:
- Subject: "Credfácil — Redefinir sua senha"
- Template HTML com link de redefinição
- Validade do link mencionada (1 hora)

**Verificar**: Enviar email de teste para endereço real

---

### D25: Criar Auth Service

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D18
**Bloqueia**: D31, D32, D33, D38

**Arquivo**: `lib/auth.ts`

**Funções**:
- `hashSenha(senha)` → bcrypt hash (10 rounds)
- `verificarSenha(senha, hash)` → boolean
- `gerarJWT(cpf, formCode)` → token string (7 dias)
- `verificarJWT(token)` → JWTPayload | null
- `gerarResetToken()` → `{ token, expira }` (1h)

**Verificar**: Script de teste com hash/verify + gerar/verificar JWT

---

## FASE 4 — Validation Functions (Código)

Uma função por documento. **Todas podem ser feitas em paralelo.**

---

### D26: Implementar validarCNH

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D17, D22
**Bloqueia**: D35

**Arquivo**: `lib/ai/validacoes/cnh.ts`

**Lógica**: Prompt Gemini → extrair nome, CPF, validade, categoria → verificar legibilidade e validade

**Critérios de rejeição**: ilegível OU CNH vencida

**Verificar**: Testar com CNH válida e CNH vencida

---

### D27: Implementar validarComprovante

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D17, D22
**Bloqueia**: D35

**Arquivo**: `lib/ai/validacoes/comprovante.ts`

**Lógica**: Prompt Gemini → extrair nome, data emissão, endereço, tipo → verificar se < 90 dias

**Critérios de rejeição**: ilegível OU emissão > 90 dias

**Verificar**: Testar com comprovante recente e antigo

---

### D28: Implementar validarSelfiePlaca

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D17, D22
**Bloqueia**: D35

**Arquivo**: `lib/ai/validacoes/selfie-placa.ts`

**Lógica**: Prompt Gemini → verificar pessoa visível, veículo, placa, autenticidade

**Critérios de rejeição**: sem pessoa OU sem veículo OU foto não autêntica

**Verificar**: Testar com selfie real e foto editada

---

### D29: Implementar validarVideoApp

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D17, D22
**Bloqueia**: D35

**Arquivo**: `lib/ai/validacoes/video-app.ts`

**Lógica**: Prompt Gemini → extrair nome perfil, placa, faturamento, tempo, corridas, detectar cortes

**Critérios de rejeição**: vídeo com cortes detectados

**Verificar**: Testar com vídeo de tela de app

---

### D30: Implementar validarVideoVeiculo

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D17, D22
**Bloqueia**: D35

**Arquivo**: `lib/ai/validacoes/video-veiculo.ts`

**Lógica**: Prompt Gemini → verificar veículo ligado, extrair placa, detectar cortes

**Critérios de rejeição**: veículo desligado OU cortes detectados

**Verificar**: Testar com vídeo de veículo

---

### D31: Implementar validarBiometria

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D17, D23
**Bloqueia**: D35

**Arquivo**: `lib/ai/validacoes/biometria.ts`

**Lógica**: Rekognition CompareFaces → score >= 90 aprovado, 80-90 pendência, < 80 rejeitado

**Verificar**: Testar com pares de fotos (mesma pessoa, pessoas diferentes)

---

## FASE 5 — API Routes (Código)

Endpoints da aplicação. **Parcialmente paralelas.**

---

### D32: Criar API /api/auth/registrar

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D25
**Bloqueia**: D40

**Arquivo**: `app/api/auth/registrar/route.ts`

**Lógica**: Receber {cpf, senha} → validar CPF existe e sem senha → hash → salvar → gerar JWT → cookie → statusDocumentos = "AGUARDANDO_DOCUMENTOS"

**Verificar**: curl POST → verificar Set-Cookie no header

---

### D33: Criar API /api/auth/login

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D25
**Bloqueia**: D39

**Arquivo**: `app/api/auth/login/route.ts`

**Lógica**: Receber {cpf, senha} → buscar → bcrypt compare → rate limit (5 tentativas, 15min bloqueio) → JWT → cookie

**Verificar**: Login correto retorna 200 + cookie. Senha errada retorna 401.

---

### D34: Criar APIs /api/auth/recuperar e /api/auth/redefinir

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D25, D24
**Bloqueia**: D43

**Arquivos**:
- `app/api/auth/recuperar/route.ts`
- `app/api/auth/redefinir/route.ts`

**Lógica recuperar**: {cpf} → buscar email → gerar token 1h → salvar → enviar email
**Lógica redefinir**: {token, novaSenha} → validar → hash → salvar → limpar token

**Verificar**: Fluxo completo: recuperar → email → redefinir → login com nova senha

---

### D35: Criar API /api/upload/presigned-url

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D21, D25 (auth)
**Bloqueia**: D41

**Arquivo**: `app/api/upload/presigned-url/route.ts`

**Lógica**: Verificar JWT → receber tipo + ext → validar → gerar presigned URL → retornar {uploadUrl, fileKey}

**Verificar**: curl com cookie → receber URL → upload via PUT

---

### D36: Implementar cruzamento validacaoIA

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D26-D31
**Bloqueia**: D37

**Arquivo**: `lib/ai/cruzamento.ts`

**Funções**:
- `cruzarDados(resultados, cpfFormulario)` → ValidacaoIA
- `calcularSimilaridade(str1, str2)` → number (Levenshtein normalizado 0-100)

**Critérios**:
| Campo | Comparação | Threshold |
|---|---|---|
| nomeConfere | CNH.nome vs videoApp.nomePerfil | >= 85% |
| cpfConfere | CNH.cpf vs formulário.cpf | igualdade exata |
| placaConfere | selfie vs videoApp vs videoVeiculo | >= 2 de 3 iguais |
| biometriaConfere | Rekognition score | >= 90% |

**Verificar**: Testar com dados mock (nomes com acento, placas iguais/diferentes)

---

### D37: Criar API /api/validacao/iniciar

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D36
**Bloqueia**: D38

**Arquivo**: `app/api/validacao/iniciar/route.ts`

**Lógica**:
1. Verificar JWT
2. Salvar URLs no MongoDB (status: "processando")
3. Retornar 200 imediatamente
4. Em background: Promise.allSettled com 6 validações
5. A cada resultado: atualizar MongoDB
6. Após todas: cruzamento → atualizar statusDocumentos
7. Se reenvio: validar apenas documento(s) específico(s), reexecutar cruzamento

**Verificar**: POST → verificar MongoDB atualizado após processamento

---

### D38: Criar API /api/validacao/status (SSE)

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D37
**Bloqueia**: D42

**Arquivo**: `app/api/validacao/status/route.ts`

**Lógica**:
- Verificar JWT
- Abrir ReadableStream com headers text/event-stream
- Polling MongoDB a cada 2s
- Enviar evento por documento que muda
- Enviar "concluido" quando statusDocumentos != "PROCESSANDO"
- Fechar stream

**Verificar**: `curl -N` com cookie → ver eventos SSE chegando

---

### D39: Criar middleware de autenticação

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D25
**Bloqueia**: D41, D42

**Arquivo**: `middleware.ts` (raiz)

**Lógica**:
- Matcher: `/(auth)/:path*`
- Ler cookie `cf_token`
- Verificar JWT
- Se válido: headers `x-user-cpf`, `x-user-formcode`
- Se inválido: redirect /login

**Verificar**: Acessar /documentos sem cookie → redirect. Com cookie → ok.

---

## FASE 6 — Pages (Código)

Interfaces do usuário. **Parcialmente paralelas.**

---

### D40: Criar página /login

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D33, D39
**Bloqueia**: D48

**Arquivo**: `app/(public)/login/page.tsx`

**UI**:
- Input CPF (com máscara XXX.XXX.XXX-XX)
- Input senha (type password)
- Botão "Entrar"
- Link "Esqueci minha senha" → /login com modo recuperação
- Link "Não tem conta? Preencha o formulário" → /
- Mensagens de erro: "CPF ou senha incorretos", "Conta bloqueada por 15 min"

**Verificar**: Login funcional → redirect /documentos

---

### D41: Redesign página /aprovado (cadastro de senha)

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D32
**Bloqueia**: D48

**Arquivo**: `app/(public)/aprovado/page.tsx`

**Mudanças**:
- Manter código formCode
- REMOVER botão WhatsApp direto (agora só após docs aprovados)
- Adicionar: Input Senha + Confirmar + Botão "Criar conta e continuar"
- Validação: mín 6 chars, senhas coincidem
- POST /api/auth/registrar → auto-login → redirect /documentos
- Manter eventos CAPI existentes

**Verificar**: Submit do formulário → /aprovado → cadastrar senha → /documentos

---

### D42: Criar página /documentos

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D35, D39
**Bloqueia**: D46, D48

**Arquivo**: `app/(auth)/documentos/page.tsx`

**UI**:
- Header: "Envie seus documentos"
- 5 slots de upload em lista vertical:
  | Slot | Label | Instrução | Formatos | Máx |
  |---|---|---|---|---|
  | CNH | Carteira de Habilitação | Foto frontal, legível | JPG, PNG | 10MB |
  | Comprovante | Comprovante de Residência | Últimos 3 meses | JPG, PNG, PDF | 10MB |
  | Selfie | Selfie ao lado do veículo | Você e o veículo com placa visível | JPG, PNG | 10MB |
  | Vídeo App | Vídeo da tela do app | Gravar perfil, faturamento e corridas | MP4, MOV | 100MB |
  | Vídeo Veículo | Vídeo do veículo ligado | Mostrar painel ligado e placa | MP4, MOV | 100MB |
- Cada slot: input file, preview (imagem) ou nome do arquivo (vídeo), progresso de upload, check ✓
- Botão "Enviar para análise" (desabilitado até 5/5)
- Se PENDENCIA: mostrar apenas docs rejeitados com motivo + botão reenviar

**Verificar**: Upload 5 arquivos → botão habilita → clique → redirect /status

---

### D43: Criar página /status

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D38, D39
**Bloqueia**: D48

**Arquivo**: `app/(auth)/status/page.tsx`

**UI**:
- "Analisando seus documentos..."
- 6 linhas de progresso:
  ```
  CNH ........................ ✓ Aprovado
  Comprovante ................ ✓ Aprovado
  Biometria facial ........... ⏳ Analisando...
  Placa (selfie) ............. ○ Aguardando
  Vídeo do app ............... ○ Aguardando
  Vídeo do veículo ........... ○ Aguardando
  ```
- Conecta SSE em /api/validacao/status
- Resultados finais:
  - APROVADO: "Documentos aprovados!" + botão WhatsApp (rodízio de números)
  - PENDENCIA: lista motivos + botão "Corrigir documentos" → /documentos
  - ANALISE_MANUAL: "Em análise pela equipe, aguarde contato"
- Reconexão automática se SSE cair
- Se já tem resultado (recarregou página): buscar estado do MongoDB

**Verificar**: Iniciar validação → ver progresso → resultado final

---

### D44: Criar página /redefinir-senha

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D34
**Bloqueia**: D48

**Arquivo**: `app/(public)/redefinir-senha/page.tsx`

**UI**:
- Input Nova senha + Confirmar
- Botão "Redefinir"
- Token lido de query string `?token=xxx`
- POST /api/auth/redefinir → sucesso → redirect /login

**Verificar**: Link com token → redefinir → login com nova senha

---

## FASE 7 — Infraestrutura Final

---

### D45: Criar Dockerfile de produção

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D42 (garantir que tudo builda)
**Bloqueia**: D46

**Arquivos**:
- `Dockerfile` (raiz)
- Atualizar `next.config.ts`: adicionar `output: 'standalone'`

**Dockerfile (multi-stage)**:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**Verificar**:
```bash
docker build -t formulario-credfacil .
docker run -p 3000:3000 --env-file .env.local formulario-credfacil
```

---

### D46: Fazer deploy no Coolify

**Tipo**: INFRA
**Responsável**: DevOps / Administrador
**Depende de**: D15 (Coolify configurado), D45 (Dockerfile pronto)
**Bloqueia**: D47, D48

**O que fazer**:
1. Push do código para GitHub (branch main)
2. Coolify deve detectar e iniciar build
3. Verificar logs de build no Coolify
4. Verificar que o container está running
5. Testar acesso via domínio (D08)
6. Verificar conexão MongoDB (logs do container)

**Verificar**: `curl https://formulario.credfacil.com.br/` retorna a página

---

### D47: Migrar variáveis de ambiente da Vercel

**Tipo**: INFRA
**Responsável**: DevOps / Administrador
**Depende de**: D46
**Bloqueia**: D48

**O que fazer**:
1. Copiar todas as env vars da Vercel para o Coolify
2. Atualizar `MONGODB_URI` para URI interna Docker
3. Atualizar `CHATWOOT_API_URL` para URL interna Docker
4. Adicionar novas env vars (R2, Gemini, AWS, JWT, SMTP)
5. Restart do container no Coolify
6. Verificar que o formulário funciona no novo domínio

**Decisão**: manter Vercel rodando em paralelo até confirmar que VPS está estável, depois desativar.

---

## FASE 8 — Integração e Testes

---

### D48: Testes end-to-end manuais

**Tipo**: MANUAL
**Responsável**: QA / Desenvolvedor / Dono do projeto
**Depende de**: D46 (deploy completo)
**Bloqueia**: D49

**Cenários de teste**:

| # | Cenário | Passos | Resultado esperado |
|---|---|---|---|
| 1 | Fluxo feliz completo | Formulário → senha → upload 5 docs válidos → análise → aprovação → WhatsApp | Tudo aprovado, botão WhatsApp funciona |
| 2 | CNH vencida | Upload CNH com validade expirada | CNH rejeitada, motivo: "CNH vencida" |
| 3 | Comprovante antigo | Upload comprovante > 90 dias | Rejeitado, motivo: "Mais de 3 meses" |
| 4 | Biometria diferente | CNH de pessoa A, selfie de pessoa B | Biometria rejeitada |
| 5 | Vídeo com cortes | Upload vídeo editado | Rejeitado: "Edição detectada" |
| 6 | Reenvio | Doc rejeitado → reenviar correto | Aprovado após reenvio |
| 7 | 3 tentativas | 3 reenvios rejeitados | Status "ANALISE_MANUAL" + alerta Telegram |
| 8 | Login retorno | Fechar browser → /login → /documentos | Estado preservado no MongoDB |
| 9 | Recuperar senha | Esqueci → email → redefinir → login | Nova senha funciona |
| 10 | Browser fecha durante validação | Fechar → reabrir → /status | Resultado visível |
| 11 | Arquivo muito grande | Upload > 100MB | Rejeitado client-side |
| 12 | Formato inválido | Upload .exe | Rejeitado client-side |
| 13 | Candidato já aprovado | Acessar /documentos com tudo aprovado | Mostra resultado + WhatsApp |

**Resultado**: Documentar pass/fail para cada cenário

---

### D49: Configurar alerta de deploy no Telegram

**Tipo**: INFRA
**Responsável**: DevOps / Administrador
**Depende de**: D48
**Bloqueia**: Nada

**O que fazer**:
1. No Coolify, configurar notificação de deploy (success/failure)
2. Usar mesmo bot Telegram existente ou criar canal separado
3. Testar fazendo push no repo

---

### D50: Documentar runbook operacional

**Tipo**: MANUAL
**Responsável**: Desenvolvedor / DevOps
**Depende de**: D48
**Bloqueia**: Nada

**Conteúdo do runbook**:
- Como acessar logs do container: `docker logs <container>`
- Como reiniciar o serviço no Coolify
- Como verificar status do MongoDB
- Como verificar se Gemini/Rekognition estão respondendo
- O que fazer quando todos os WhatsApp estão indisponíveis
- Como aprovar manualmente um candidato em ANALISE_MANUAL
- Como verificar o bucket R2 (Cloudflare dashboard)

---

### D51: Desativar deploy da Vercel

**Tipo**: MANUAL
**Responsável**: Administrador
**Depende de**: D48 (testes aprovados)
**Bloqueia**: Nada

**O que fazer**:
1. Confirmar que o formulário na VPS está funcionando por pelo menos 48h
2. Redirecionar DNS do domínio antigo (Vercel) para a VPS (se aplicável)
3. Desativar auto-deploy na Vercel
4. (Opcional) Deletar projeto na Vercel ou manter como backup

**Atenção**: Não desativar antes de confirmar estabilidade na VPS.

---

### D52: Atualizar documentação do projeto

**Tipo**: DEV
**Responsável**: Desenvolvedor
**Depende de**: D48
**Bloqueia**: Nada

**O que fazer**:
- Atualizar `.specs/codebase/STACK.md` com novas dependências
- Atualizar `.specs/codebase/ARCHITECTURE.md` com pipeline de IA
- Atualizar `.specs/codebase/STRUCTURE.md` com novos arquivos
- Atualizar `.specs/codebase/INTEGRATIONS.md` com Gemini, Rekognition, R2
- Atualizar `.specs/project/PROJECT.md` com novo escopo
- Marcar feature como COMPLETE no `ROADMAP.md`

---

## Resumo por tipo de demanda

| Tipo | Quantidade | Responsável sugerido |
|---|---|---|
| MANUAL (contas, acessos, testes) | 14 | Administrador / Dono do projeto |
| INFRA (VPS, Coolify, deploy) | 8 | DevOps / Administrador |
| DEV (código) | 30 | Desenvolvedor |
| **Total** | **52** | |

## Ordem crítica (caminho mais longo)

```
D01 → D02 ─────────────────────────────────────┐
D03 → D04 ─────────────────────────────────────┤
D05 → D06 ─────────────────────────────────────┤
D07 ────────────────────────────────────────────┤
D08 ────────────────────────────────────────────┤
                                                ▼
D16 → D17 → D22 → D26-D30 → D36 → D37 → D38 → D45 → D46 → D48
                                                ▲
D19 → D25 → D32 → D41 ─────────────────────────┤
           → D33 → D39 → D42 ──────────────────┘
```

**Caminho crítico estimado**: D01 + D02 + D16 + D17 + D22 + D26 + D36 + D37 + D38 + D45 + D46 + D48

As demandas MANUAL (D01-D09) podem ser feitas **imediatamente e em paralelo** enquanto o desenvolvimento ainda não começou. Elas são pré-requisito para testes reais mas não bloqueiam o desenvolvimento inicial (mocks podem ser usados).
