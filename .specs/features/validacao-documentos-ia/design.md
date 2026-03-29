# Validação de Documentos com IA — Design

**Spec**: `.specs/features/validacao-documentos-ia/spec.md`
**Status**: Approved

---

## Architecture Overview

Monolito Next.js estendido rodando na VPS via Coolify. Upload direto para R2 via presigned URLs. Pipeline de validação orquestrado pela aplicação com Promise.allSettled. Progresso via SSE.

```mermaid
graph TD
    subgraph Browser
        A[Candidato] --> B[/documentos]
        B -->|presigned URL| C[Cloudflare R2]
        B -->|POST /api/validacao/iniciar| D
        A --> S[/status - SSE]
    end

    subgraph VPS Coolify
        D[API: iniciar] -->|Promise.allSettled| E[Pipeline IA]
        E --> F[Gemini: CNH]
        E --> G[Gemini: Comprovante]
        E --> H[Gemini: Selfie/Placa]
        E --> I[Rekognition: Biometria]
        E --> J[Gemini: Video App]
        E --> K[Gemini: Video Veiculo]
        F & G & H & I & J & K --> L[Cruzamento validacaoIA]
        L --> M[(MongoDB)]
        D --> M
        N[API: status SSE] --> M
    end

    subgraph External
        C[Cloudflare R2]
        O[Google Gemini API]
        P[AWS Rekognition API]
        Q[Telegram Bot API]
    end

    F & G & H & J & K -->|request| O
    I -->|request| P
    L -->|alerta 3+ tentativas| Q
    S -->|SSE events| N
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
|---|---|---|
| CardWrapper | `components/CardWrapper.tsx` | Reutilizar para animação nos cards de upload e status |
| ProgressBar | `components/ProgressBar.tsx` | Adaptar para progresso de validação (6 itens) |
| BotaoAvancar | `components/BotaoAvancar.tsx` | Reutilizar no botão "Enviar para análise" |
| mongodb.ts | `lib/mongodb.ts` | Mesma conexão, mesmo singleton |
| whatsapp-rotation.ts | `lib/whatsapp-rotation.ts` | Chamada no final (após aprovação dos documentos) |
| telegram-alert.ts | `lib/telegram-alert.ts` | Reutilizar para alertas de 3+ tentativas |
| validators.ts | `lib/validators.ts` | Estender com validações de arquivo (tipo, tamanho) |
| types/formulario.ts | `types/formulario.ts` | Base para tipos, novos tipos em `types/documentos.ts` |

### Integration Points

| System | Integration Method |
|---|---|
| MongoDB (conversations) | Campos adicionados ao documento existente do candidato |
| Chatwoot + WhatsApp | Reutiliza `getAvailableWhatsAppNumber()` após aprovação |
| Telegram | Reutiliza `sendTelegramAlert()` para alertas de reenvio |
| Vercel Analytics | Adicionar `track()` para eventos de documentos |

---

## Components

### Auth Service

- **Purpose**: Gerenciar registro, login, JWT e recuperação de senha
- **Location**: `lib/auth.ts`
- **Interfaces**:
  - `hashSenha(senha: string): Promise<string>` — bcrypt hash
  - `verificarSenha(senha: string, hash: string): Promise<boolean>` — bcrypt compare
  - `gerarJWT(cpf: string, formCode: string): string` — JWT com payload {cpf, formCode}
  - `verificarJWT(token: string): JWTPayload | null` — verificar e decodificar
  - `gerarResetToken(): { token: string, expira: Date }` — token de 1h para email
- **Dependencies**: jsonwebtoken, bcrypt (ou bcryptjs para compatibilidade)
- **Reuses**: Nenhum existente

### R2 Client

- **Purpose**: Gerar presigned URLs para upload e leitura de arquivos no Cloudflare R2
- **Location**: `lib/r2.ts`
- **Interfaces**:
  - `gerarPresignedUpload(formCode: string, tipo: TipoDocumento, ext: string): Promise<{ uploadUrl: string, fileUrl: string }>` — URL PUT válida por 10min
  - `gerarPresignedRead(key: string): Promise<string>` — URL GET válida por 1h (para IAs lerem)
  - `deletarArquivo(key: string): Promise<void>` — limpar arquivo anterior no reenvio
- **Dependencies**: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
- **Reuses**: Nenhum existente

### Gemini Client

- **Purpose**: Inicializar e chamar Google Gemini Flash para análise de imagem e vídeo
- **Location**: `lib/ai/gemini.ts`
- **Interfaces**:
  - `analisarImagem(imageUrl: string, prompt: string): Promise<Record<string, unknown>>` — envia imagem + prompt, retorna JSON parseado
  - `analisarVideo(videoUrl: string, prompt: string): Promise<Record<string, unknown>>` — envia vídeo + prompt, retorna JSON parseado
- **Dependencies**: @google/generative-ai
- **Reuses**: Nenhum existente

### Rekognition Client

- **Purpose**: Comparar rostos entre CNH e selfie via AWS Rekognition
- **Location**: `lib/ai/rekognition.ts`
- **Interfaces**:
  - `compararRostos(sourceUrl: string, targetUrl: string): Promise<{ similarity: number, match: boolean }>` — compara duas imagens faciais
- **Dependencies**: @aws-sdk/client-rekognition
- **Reuses**: Nenhum existente

### Validation Functions (uma por documento)

- **Purpose**: Encapsular prompt, chamada da IA e parsing do resultado para cada tipo de documento
- **Location**: `lib/ai/validacoes/`
- **Interfaces** (todas retornam `Promise<ResultadoValidacao>`):
  - `validarCNH(imageUrl: string): Promise<ResultadoCNH>`
  - `validarComprovante(imageUrl: string): Promise<ResultadoComprovante>`
  - `validarSelfiePlaca(imageUrl: string): Promise<ResultadoSelfie>`
  - `validarBiometria(cnhUrl: string, selfieUrl: string): Promise<ResultadoBiometria>`
  - `validarVideoApp(videoUrl: string): Promise<ResultadoVideoApp>`
  - `validarVideoVeiculo(videoUrl: string): Promise<ResultadoVideoVeiculo>`
- **Dependencies**: `lib/ai/gemini.ts`, `lib/ai/rekognition.ts`

### Crosscheck Service

- **Purpose**: Cruzar dados extraídos entre documentos e atualizar validacaoIA
- **Location**: `lib/ai/cruzamento.ts`
- **Interfaces**:
  - `cruzarDados(resultados: ResultadosTodos, cpfFormulario: string): ValidacaoIA` — executa 4 comparações
  - `calcularSimilaridade(str1: string, str2: string): number` — Levenshtein normalizado 0-100
- **Dependencies**: Nenhuma externa
- **Reuses**: Nenhum existente

### Email Service

- **Purpose**: Enviar email de recuperação de senha
- **Location**: `lib/email.ts`
- **Interfaces**:
  - `enviarEmailRecuperacao(email: string, nome: string, token: string): Promise<boolean>`
- **Dependencies**: nodemailer ou Resend (TBD)
- **Reuses**: Nenhum existente

### Middleware de Auth

- **Purpose**: Proteger rotas /(auth)/* verificando JWT no cookie
- **Location**: `middleware.ts` (raiz)
- **Interfaces**: Next.js middleware padrão — intercepta request, verifica cookie `cf_token`
- **Dependencies**: `lib/auth.ts`
- **Reuses**: Nenhum existente

### Página /documentos

- **Purpose**: Interface de upload dos 5 documentos com preview e validação client-side
- **Location**: `app/(auth)/documentos/page.tsx`
- **Dependencies**: `lib/r2.ts` (via API), componentes existentes
- **Reuses**: `CardWrapper`, `BotaoAvancar`, padrão de estado local do formulário atual

### Página /status

- **Purpose**: Progresso em tempo real via SSE mostrando cada validação
- **Location**: `app/(auth)/status/page.tsx`
- **Dependencies**: EventSource API (nativa do browser)
- **Reuses**: `ProgressBar` (adaptada)

---

## Data Models

### Campos adicionados ao documento MongoDB (collection `conversations`)

```typescript
// types/documentos.ts

export type TipoDocumento = 'cnh' | 'comprovante' | 'selfie' | 'videoApp' | 'videoVeiculo';
export type StatusDocumento = 'pendente' | 'enviado' | 'processando' | 'aprovado' | 'rejeitado' | 'erro';
export type StatusDocumentos = 'AGUARDANDO_DOCUMENTOS' | 'PROCESSANDO' | 'APROVADO' | 'PENDENCIA' | 'ANALISE_MANUAL';

export interface DocumentoInfo {
  url: string | null;
  status: StatusDocumento;
  tentativas: number;
  resultado: ResultadoValidacao | null;
  atualizadoEm: string | null;
}

export interface ResultadoValidacao {
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: Record<string, unknown>;
}

export interface ValidacaoIA {
  nomeConfere: boolean | null;
  placaConfere: boolean | null;
  cpfConfere: boolean | null;
  biometriaConfere: boolean | null;
  biometriaScore: number | null;
}

export interface DocumentosMap {
  cnh: DocumentoInfo;
  comprovante: DocumentoInfo;
  selfie: DocumentoInfo;
  videoApp: DocumentoInfo;
  videoVeiculo: DocumentoInfo;
}

// Resultados específicos por tipo de documento
export interface ResultadoCNH {
  nome: string;
  cpf: string;
  validade: string;
  categoria: string;
  legivel: boolean;
}

export interface ResultadoComprovante {
  nome: string;
  dataEmissao: string;
  endereco: string;
  tipo: string;
  legivel: boolean;
}

export interface ResultadoSelfie {
  pessoaVisivel: boolean;
  veiculoVisivel: boolean;
  placaVisivel: boolean;
  placa: string | null;
  aparentementeAutentica: boolean;
}

export interface ResultadoBiometria {
  similarity: number;
  match: boolean;
}

export interface ResultadoVideoApp {
  nomePerfil: string | null;
  placa: string | null;
  faturamento180d: string | null;
  tempoUso: string | null;
  totalCorridas: string | null;
  temCortes: boolean;
  aplicativo: string | null;
}

export interface ResultadoVideoVeiculo {
  veiculoLigado: boolean;
  placaVisivel: boolean;
  placa: string | null;
  temCortes: boolean;
}
```

### Campos novos no documento MongoDB

```javascript
{
  // --- existentes (não mudam) ---
  cpf, nomeCompleto, email, trabalho, referencias, formCode, contactId, ...

  // --- autenticação ---
  senhaHash: String,           // bcrypt
  resetToken: String | null,
  resetTokenExpira: String | null,

  // --- documentos ---
  documentos: {
    cnh:         { url, status, tentativas, resultado, atualizadoEm },
    comprovante: { url, status, tentativas, resultado, atualizadoEm },
    selfie:      { url, status, tentativas, resultado, atualizadoEm },
    videoApp:    { url, status, tentativas, resultado, atualizadoEm },
    videoVeiculo:{ url, status, tentativas, resultado, atualizadoEm },
  },

  // --- cruzamento ---
  validacaoIA: {
    nomeConfere: Boolean | null,
    placaConfere: Boolean | null,
    cpfConfere: Boolean | null,
    biometriaConfere: Boolean | null,
    biometriaScore: Number | null,
  },

  // --- status geral ---
  statusDocumentos: String,  // AGUARDANDO_DOCUMENTOS | PROCESSANDO | APROVADO | PENDENCIA | ANALISE_MANUAL
  analistaAlertado: Boolean,
}
```

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
|---|---|---|
| Upload R2 falha (rede) | Retry client-side, exibe erro | "Erro no envio. Tente novamente" |
| Gemini 429 (rate limit) | Retry 2x com backoff 5s | Atraso na validação, SSE mostra "Aguardando..." |
| Gemini resposta non-JSON | Marcar como "erro", não contar tentativa | "Erro na análise, reprocessando..." |
| Rekognition falha | Marcar biometria como "erro" | "Verificação facial indisponível, tentando novamente" |
| MongoDB desconecta | Retry via singleton, erro 500 se persistir | "Erro interno, tente novamente em instantes" |
| SSE conexão cai | Reconexão automática via EventSource | Breve flash de "Reconectando..." |
| Candidato fecha browser durante validação | Processamento continua no servidor | Ao voltar, /status mostra resultado atual |
| Todas as validações de um doc falham (API errors) | Não incrementar tentativas, permitir reprocessar | "Erro técnico, clique para tentar novamente" |
| Presigned URL expira antes do upload | Gerar nova URL automaticamente | Transparente para o candidato |

---

## Tech Decisions

| Decision | Choice | Rationale |
|---|---|---|
| bcrypt para senhas | bcryptjs (JS puro) | Compatibilidade com Alpine Docker, sem dependência nativa |
| JWT storage | httpOnly cookie (7 dias) | Mais seguro que localStorage, proteção CSRF natural |
| SSE vs WebSocket | Server-Sent Events | Fluxo unidirecional, mais simples, sem lib extra |
| Presigned URL vs upload via API | Presigned URL direto para R2 | Não consome banda/CPU da VPS, melhor performance |
| Gemini Flash vs Pro | Flash | Mais rápido, mais barato, suficiente para OCR e análise de vídeo |
| Promise.allSettled vs Promise.all | allSettled | Uma falha não cancela as outras validações |
| Levenshtein para nomes | Normalizado 0-100 | Tolera abreviações e acentos diferentes entre CNH e app |
| Email service | Resend (ou nodemailer com SMTP) | TBD — Resend é simples mas pago; nodemailer gratuito com SMTP |
| Node 20 Alpine | node:20-alpine | Imagem leve (~50MB), LTS, compatível com Next.js 16 |

---

## Prompts de IA

### CNH (Gemini Flash)

```
Analise esta imagem de CNH brasileira e extraia:
1. Nome completo
2. CPF
3. Data de validade (formato YYYY-MM-DD)
4. Categoria da habilitação
5. A imagem está legível e sem cortes?

Responda APENAS em JSON:
{
  "nome": "...",
  "cpf": "...",
  "validade": "YYYY-MM-DD",
  "categoria": "...",
  "legivel": true/false
}
```

### Comprovante de Residência (Gemini Flash)

```
Analise este comprovante de residência brasileiro e extraia:
1. Nome do titular
2. Data de emissão ou referência (formato YYYY-MM-DD)
3. Endereço completo
4. Tipo do comprovante (conta de luz, água, telefone, etc.)
5. O documento está legível e sem cortes?

Responda APENAS em JSON:
{
  "nome": "...",
  "dataEmissao": "YYYY-MM-DD",
  "endereco": "...",
  "tipo": "...",
  "legivel": true/false
}
```

### Selfie ao lado do veículo (Gemini Flash)

```
Analise esta foto de uma pessoa ao lado de um veículo e extraia:
1. Há uma pessoa claramente visível na foto?
2. Há um veículo visível na foto?
3. A placa do veículo está visível? Se sim, qual o texto da placa?
4. A foto parece autêntica (sem edição visível)?

Responda APENAS em JSON:
{
  "pessoaVisivel": true/false,
  "veiculoVisivel": true/false,
  "placaVisivel": true/false,
  "placa": "...",
  "aparentementeAutentica": true/false
}
```

### Vídeo do App (Gemini Flash)

```
Analise este vídeo da tela de um aplicativo de transporte/entrega e extraia:
1. Nome do perfil visível no app
2. Placa do veículo (se visível no app)
3. Faturamento dos últimos 180 dias (se visível)
4. Tempo de uso/cadastro no app (se visível)
5. Total de corridas/entregas (se visível)
6. O vídeo apresenta cortes ou edição visível?
7. Qual aplicativo está sendo mostrado?

Responda APENAS em JSON:
{
  "nomePerfil": "...",
  "placa": "...",
  "faturamento180d": "...",
  "tempoUso": "...",
  "totalCorridas": "...",
  "temCortes": true/false,
  "aplicativo": "..."
}
```

### Vídeo do Veículo (Gemini Flash)

```
Analise este vídeo de um veículo e extraia:
1. O veículo aparenta estar ligado (painel aceso, motor funcionando)?
2. A placa do veículo está visível? Se sim, qual o texto?
3. O vídeo apresenta cortes ou edição visível?

Responda APENAS em JSON:
{
  "veiculoLigado": true/false,
  "placaVisivel": true/false,
  "placa": "...",
  "temCortes": true/false
}
```

### Critérios de aprovação por documento

| Documento | Critério | Threshold |
|---|---|---|
| CNH | legivel + validade >= hoje | Data exata |
| Comprovante | legivel + dataEmissao <= 90 dias | 90 dias |
| Selfie | pessoaVisivel + veiculoVisivel + autêntica | Boolean |
| Biometria | Rekognition similarity | >= 90% aprova, 80-90% pendência, < 80% rejeita |
| Vídeo App | temCortes == false | Boolean |
| Vídeo Veículo | veiculoLigado + temCortes == false | Boolean |

### Critérios de cruzamento (validacaoIA)

| Campo | Comparação | Critério |
|---|---|---|
| nomeConfere | CNH.nome vs videoApp.nomePerfil | Levenshtein >= 85% |
| cpfConfere | CNH.cpf vs formulário.cpf | Igualdade exata |
| placaConfere | selfie.placa vs videoApp.placa vs videoVeiculo.placa | >= 2 de 3 iguais |
| biometriaConfere | Rekognition score | >= 90% |
