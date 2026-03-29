# Validação de Documentos com IA — Specification

## Problem Statement

Hoje os candidatos aprovados na triagem do formulário enviam documentos manualmente pelo WhatsApp, onde um analista verifica cada arquivo. Isso cria gargalo operacional, não escala com volume, e é vulnerável a fraudes (documentos editados, identidade falsa). A automação com IA elimina o gargalo, reduz tempo de análise de horas para segundos, e adiciona verificações de integridade impossíveis manualmente.

## Goals

- [ ] Candidato envia 5 documentos e recebe resultado da análise em < 2 minutos
- [ ] IA valida automaticamente 6 critérios (CNH, comprovante, biometria, placa, vídeo app, vídeo veículo)
- [ ] Cruzamento automático de dados entre documentos (nome, CPF, placa, rosto)
- [ ] Candidato tem área própria com login para acompanhar status e reenviar documentos
- [ ] Analista é alertado automaticamente após 3 tentativas falhas de um documento

## Out of Scope

- Validação biométrica com certificação regulatória bancária
- Confirmação de modelo/ano do veículo por IA
- Continuidade entre dispositivos como requisito funcional
- Migração do painel-credfacil (projeto separado)
- Envio automático de mensagens WhatsApp pela aplicação

---

## User Stories

### P1: Upload de documentos ⭐ MVP

**User Story**: Como candidato aprovado, quero enviar meus 5 documentos pela área logada para que sejam analisados automaticamente.

**Why P1**: Sem upload, não há validação. É o ponto de entrada de toda a feature.

**Acceptance Criteria**:

1. WHEN candidato acessa /documentos autenticado THEN sistema SHALL exibir 5 slots de upload (CNH, Comprovante, Selfie+Veículo, Vídeo App, Vídeo Veículo)
2. WHEN candidato seleciona arquivo válido THEN sistema SHALL fazer upload via presigned URL direto para R2 e exibir preview/confirmação
3. WHEN candidato seleciona arquivo com formato inválido THEN sistema SHALL rejeitar com mensagem "Formato não suportado. Use JPG, PNG ou PDF"
4. WHEN candidato seleciona arquivo maior que o limite THEN sistema SHALL rejeitar com mensagem "Arquivo muito grande. Máximo: 10MB para imagens, 100MB para vídeos"
5. WHEN todos os 5 documentos estão enviados THEN sistema SHALL habilitar botão "Enviar para análise"
6. WHEN candidato clica "Enviar para análise" THEN sistema SHALL salvar URLs no MongoDB e redirecionar para /status

**Independent Test**: Fazer upload de 5 arquivos de teste e verificar que todos chegaram no R2 com path correto `documentos/{formCode}/{tipo}_{timestamp}.{ext}`

---

### P1: Autenticação do candidato ⭐ MVP

**User Story**: Como candidato, quero criar minha senha após o formulário e acessar minha área para enviar documentos e acompanhar o status.

**Why P1**: Sem autenticação, não há área do candidato. Bloqueia todo o fluxo.

**Acceptance Criteria**:

1. WHEN candidato completa o formulário (submit com sucesso) THEN sistema SHALL exibir tela de cadastro de senha no /aprovado
2. WHEN candidato define senha (mín 6 caracteres) e confirma THEN sistema SHALL salvar hash bcrypt no MongoDB, gerar JWT httpOnly cookie (7 dias), e redirecionar para /documentos (auto-login)
3. WHEN candidato retorna depois e acessa /login THEN sistema SHALL aceitar CPF + senha e gerar JWT
4. WHEN candidato erra a senha 5 vezes THEN sistema SHALL bloquear login por 15 minutos
5. WHEN candidato acessa rota protegida /(auth)/* sem JWT válido THEN sistema SHALL redirecionar para /login
6. WHEN candidato clica "Esqueci minha senha" THEN sistema SHALL enviar email com link de redefinição (token válido por 1h)

**Independent Test**: Criar senha, sair, fazer login com CPF + senha, verificar acesso a /documentos

---

### P1: Pipeline de validação com IA ⭐ MVP

**User Story**: Como sistema, quero validar automaticamente os 5 documentos usando Gemini e Rekognition para aprovar ou rejeitar cada um com critérios objetivos.

**Why P1**: Core da feature. Sem IA, volta ao processo manual.

**Acceptance Criteria**:

1. WHEN /api/validacao/iniciar é chamado THEN sistema SHALL disparar 6 validações em paralelo via Promise.allSettled
2. WHEN Gemini analisa CNH THEN sistema SHALL extrair nome, CPF, validade, categoria e verificar legibilidade
3. WHEN Gemini analisa comprovante THEN sistema SHALL extrair nome, data de emissão, endereço e rejeitar se > 90 dias
4. WHEN Gemini analisa selfie THEN sistema SHALL verificar pessoa visível, veículo visível, extrair placa, verificar autenticidade
5. WHEN Rekognition compara selfie vs CNH THEN sistema SHALL aprovar se score >= 90%, marcar pendência se 80-90%, rejeitar se < 80%
6. WHEN Gemini analisa vídeo do app THEN sistema SHALL extrair nome perfil, placa, faturamento 180d, tempo uso, total corridas, detectar cortes
7. WHEN Gemini analisa vídeo do veículo THEN sistema SHALL verificar veículo ligado, extrair placa, detectar cortes
8. WHEN qualquer validação falha com erro de API THEN sistema SHALL marcar documento como "erro" e permitir reprocessamento sem contar como tentativa

**Independent Test**: Submeter set de documentos de teste (válidos e inválidos) e verificar resultados no MongoDB

---

### P1: Cruzamento de dados (validacaoIA) ⭐ MVP

**User Story**: Como sistema, quero cruzar dados extraídos entre documentos para detectar inconsistências.

**Why P1**: Sem cruzamento, cada documento é validado isoladamente e fraudes passam.

**Acceptance Criteria**:

1. WHEN todas as 6 validações individuais terminam THEN sistema SHALL executar cruzamento automático
2. WHEN nome da CNH vs nome do perfil no vídeo app THEN sistema SHALL aprovar se similaridade Levenshtein >= 85%
3. WHEN CPF da CNH vs CPF do formulário THEN sistema SHALL aprovar se igualdade exata
4. WHEN placa da selfie vs placa do vídeo app vs placa do vídeo veículo THEN sistema SHALL aprovar se pelo menos 2 de 3 são iguais
5. WHEN Rekognition score da biometria THEN sistema SHALL registrar valor numérico e aprovar/rejeitar por threshold
6. WHEN qualquer cruzamento falha THEN sistema SHALL marcar statusDocumentos como "PENDENCIA" com motivo específico

**Independent Test**: Submeter documentos com nome levemente diferente na CNH vs app e verificar que o cruzamento detecta/tolera

---

### P1: Progresso em tempo real ⭐ MVP

**User Story**: Como candidato, quero ver cada documento sendo validado em tempo real para saber o que está acontecendo.

**Why P1**: Sem feedback, candidato fica 2 minutos numa tela parada — experiência ruim.

**Acceptance Criteria**:

1. WHEN candidato acessa /status THEN sistema SHALL abrir conexão SSE com /api/validacao/status
2. WHEN uma validação individual termina THEN sistema SHALL enviar evento SSE com tipo do documento, status e resultado
3. WHEN todas as validações terminam THEN sistema SHALL enviar evento "concluido" com statusFinal e validacaoIA
4. WHEN statusFinal == "APROVADO" THEN sistema SHALL exibir botão WhatsApp (com rodízio de números)
5. WHEN statusFinal == "PENDENCIA" THEN sistema SHALL exibir quais documentos reenviar e o motivo de cada um
6. WHEN conexão SSE cai THEN sistema SHALL reconectar automaticamente e buscar estado atual do MongoDB

**Independent Test**: Abrir /status e verificar que eventos SSE chegam conforme validações terminam no backend

---

### P1: Reenvio de documentos ⭐ MVP

**User Story**: Como candidato, quero reenviar apenas o documento rejeitado para corrigir o problema apontado.

**Why P1**: Sem reenvio, candidato precisa reenviar tudo ou é bloqueado.

**Acceptance Criteria**:

1. WHEN documento tem status "rejeitado" e tentativas < 3 THEN sistema SHALL exibir botão "Reenviar" com o motivo da rejeição
2. WHEN candidato reenvia documento THEN sistema SHALL fazer novo upload para R2 (novo path), incrementar tentativas, e disparar validação apenas desse documento
3. WHEN reenvio é aprovado THEN sistema SHALL reexecutar cruzamento de dados com os resultados atualizados
4. WHEN tentativas de um documento atingem 3 e ainda rejeitado THEN sistema SHALL marcar statusDocumentos como "ANALISE_MANUAL" e alertar analista via Telegram
5. WHEN statusDocumentos == "ANALISE_MANUAL" THEN sistema SHALL exibir "Seus documentos estão em análise pela equipe"

**Independent Test**: Rejeitar um documento de teste, reenviar, verificar que apenas aquele documento é revalidado e o contador incrementa

---

### P1: Infraestrutura Docker + Coolify ⭐ MVP

**User Story**: Como operador, quero o formulário rodando como container no Coolify da VPS para ter controle total e sem timeout.

**Why P1**: Sem infra, nada roda. Bloqueia deploy.

**Acceptance Criteria**:

1. WHEN deploy via Coolify (push no GitHub) THEN sistema SHALL buildar imagem Docker e servir em domínio com SSL
2. WHEN container inicia THEN sistema SHALL conectar ao MongoDB via rede interna Docker
3. WHEN API route de validação roda > 60s THEN sistema SHALL completar normalmente (sem timeout)
4. WHEN container reinicia THEN sistema SHALL reconectar ao MongoDB e retomar operação

**Independent Test**: Push no repo, verificar que Coolify builda e serve o formulário no domínio configurado

---

### P2: Recuperação de senha

**User Story**: Como candidato, quero recuperar minha senha via email caso esqueça.

**Why P2**: Importante para retenção, mas não bloqueia o fluxo inicial (candidato cria senha e usa na mesma sessão).

**Acceptance Criteria**:

1. WHEN candidato informa CPF em /login e clica "Esqueci minha senha" THEN sistema SHALL buscar email associado e enviar link com token (1h validade)
2. WHEN candidato acessa link de redefinição com token válido THEN sistema SHALL exibir formulário de nova senha
3. WHEN candidato define nova senha THEN sistema SHALL atualizar hash no MongoDB e invalidar token
4. WHEN token expirado ou já usado THEN sistema SHALL exibir "Link expirado, solicite novamente"

**Independent Test**: Solicitar recuperação, verificar email recebido, redefinir senha, fazer login com nova senha

---

### P3: Área do candidato expandida

**User Story**: Como candidato, quero ver meus dados e status geral do processo na minha área.

**Why P3**: Nice-to-have para v1. Fundação construída com a autenticação, página pode ser adicionada depois.

**Acceptance Criteria**:

1. WHEN candidato acessa /perfil THEN sistema SHALL exibir dados pessoais, status dos documentos e histórico de envios

---

## Edge Cases

- WHEN upload do R2 falha (rede, timeout) THEN sistema SHALL exibir "Erro no envio. Tente novamente" e permitir retry sem perder outros uploads
- WHEN API do Gemini retorna erro 429 (rate limit) THEN sistema SHALL aguardar 5s e tentar novamente (máx 2 retries)
- WHEN API do Rekognition falha THEN sistema SHALL marcar biometria como "erro" e não contar como tentativa
- WHEN candidato fecha o browser durante validação THEN sistema SHALL continuar processando no servidor e candidato pode ver resultado ao voltar via /status
- WHEN candidato tenta enviar para análise com documento faltando THEN sistema SHALL manter botão desabilitado e indicar quais documentos faltam
- WHEN vídeo é muito curto (< 3s) THEN sistema SHALL rejeitar com "Vídeo muito curto. Grave pelo menos 5 segundos"
- WHEN Gemini não consegue extrair placa de nenhuma fonte THEN sistema SHALL marcar placaConfere como null e escalar para revisão humana
- WHEN candidato já tem statusDocumentos == "APROVADO" e acessa /documentos THEN sistema SHALL exibir resultado final e botão WhatsApp

---

## Success Criteria

- [ ] Candidato completa upload + validação em < 2 minutos (excluindo tempo de gravação de vídeo)
- [ ] 90%+ dos documentos válidos são aprovados automaticamente sem intervenção humana
- [ ] 95%+ dos documentos fraudulentos são detectados (cortes em vídeo, rosto diferente, placa inconsistente)
- [ ] Zero dados sensíveis expostos no path de storage (usando formCode UUID, não CPF)
- [ ] Tempo de indisponibilidade zero durante deploy (Coolify rolling restart)
