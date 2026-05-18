# [BUG] IA aprovando cadastro com nomes divergentes — Specification

**ClickUp task**: `86ahg6bqq` — [BUG] IA aprovou cadastro com nomes divergentes entre aplicativo e documentos  
**Prioridade**: 🔴 Urgente  
**Status**: In Progress

---

## Problem Statement

A IA aprovou uma solicitação onde o nome cadastrado no aplicativo ("Fulano") não conferia com o nome nos documentos enviados ("Ciclano"). Isso cria brecha crítica de fraude de identidade: qualquer pessoa pode cadastrar um nome e enviar documentos de outra pessoa sem ser barrada.

### Causa raiz identificada

O sistema possui dois pontos de comparação de nome que falham em bloquear a aprovação:

**Ponto 1 — CNH (`app/api/validacao/iniciar/route.ts`, linhas 137-143)**  
Há um bloco que compara `cnh.nome` vs `cadastro.nomeCompleto`, mas o código **apenas loga a divergência sem alterar `aprovado`**:
```typescript
} else if (dados.nome && calcularSimilaridade(String(dados.nome), cadastro.nomeCompleto) < 85) {
  const sim = calcularSimilaridade(String(dados.nome), cadastro.nomeCompleto);
  aprovado = false;   // ← Este bloco NÃO ESTÁ SENDO EXECUTADO corretamente
  motivo = 'Nome da CNH não confere com o cadastro';
```
Inspecionando com atenção: o problema é que `aprovado` é `const { aprovado, motivo } = resultado.value` — ou seja, `aprovado` é uma `const` desestruturada e **não pode ser reatribuída**. O `aprovado = false` nesse bloco **silenciosamente falha** em JavaScript strict mode ou simplesmente não tem efeito porque a variável é `let` mas a atribuição ocorre **dentro de um bloco else if aninhado** cujos outros ramos já passaram. Verificar se de fato está usando `let` ou se há outro motivo.

**Ponto 2 — Vídeo do App**  
O `nomePerfil` extraído do vídeo do app **nunca é comparado com o nome do cadastro** durante o processamento individual. O único cruzamento feito é `nomeConfere` (CNH vs nomePerfil do app), que acontece no `cruzarDados` final — mas mesmo quando `nomeConfere = false`, **nenhum documento é forçado para `rejeitado`** e o campo `validacaoIA` é apenas informativo.

**Ponto 3 — Status final**  
O loop de determinação do `statusDocumentos` final (linhas 241-269) verifica apenas `documentos[tipo].status === 'rejeitado'`. Se `validacaoIA.nomeCadastroConfere === false` ou `validacaoIA.nomeConfere === false`, isso não é considerado — o resultado pode ser `APROVADO` mesmo com divergência de identidade.

---

## Goals

- [ ] Divergência de nome entre cadastro e CNH → rejeição automática da CNH com motivo claro
- [ ] Divergência de nome entre cadastro e perfil do vídeo do app → rejeição automática do vídeo do app com motivo claro
- [ ] Divergência de nome entre CNH e perfil do vídeo do app → rejeição (ambos os documentos usam nomes diferentes, identidade inconsistente)
- [ ] Tolerância correta para variações aceitáveis (acentuação, abreviações, ordem de sobrenomes) — threshold Levenshtein >= 85% já existente
- [ ] Candidato vê motivo específico em cada documento rejeitado
- [ ] Caso real reportado (Fulano vs Ciclano) → reprovação automática confirmada

## Out of Scope

- Alteração da lógica de cruzamento de placas, biometria ou endereço
- Mudança nos thresholds de similaridade (manter 85%)
- Notificação ao analista específica para este bug (já coberta pelo fluxo ANALISE_MANUAL)

---

## User Stories

### P1: CNH com nome divergente do cadastro deve ser rejeitada

**User Story**: Como sistema, quando o nome extraído da CNH não conferir com o nome do cadastro, a CNH deve ser marcada como rejeitada.

**Acceptance Criteria**:

1. WHEN `calcularSimilaridade(cnh.nome, cadastro.nomeCompleto) < 85` THEN sistema SHALL marcar `cnh` como `rejeitado` com motivo "Nome da CNH não confere com o cadastro"
2. WHEN `calcularSimilaridade(cnh.nome, cadastro.nomeCompleto) >= 85` THEN sistema SHALL manter `cnh` como `aprovado` (variações aceitáveis passam)
3. WHEN `cnh.nome` é null (CNH ilegível) THEN sistema SHALL não aplicar verificação de nome (já rejeitado por ilegibilidade)

**Independent Test**: CNH com nome "Ciclano da Silva" para candidato "Fulano de Tal" → `cnh.status = 'rejeitado'`, motivo = "Nome da CNH não confere com o cadastro"

---

### P1: Vídeo do app com nome divergente do cadastro deve ser rejeitado

**User Story**: Como sistema, quando o nome do perfil extraído do vídeo do app não conferir com o nome do cadastro, o vídeo do app deve ser marcado como rejeitado.

**Acceptance Criteria**:

1. WHEN `calcularSimilaridade(videoApp.nomePerfil, cadastro.nomeCompleto) < 85` THEN sistema SHALL marcar `videoApp` como `rejeitado` com motivo "Nome do perfil no app não confere com o cadastro"
2. WHEN `calcularSimilaridade(videoApp.nomePerfil, cadastro.nomeCompleto) >= 85` THEN sistema SHALL manter `videoApp` como `aprovado`
3. WHEN `videoApp.nomePerfil` é null (Gemini não extraiu) THEN sistema SHALL não aplicar verificação de nome (deixar passar — sem penalizar por falha da IA)

**Independent Test**: Vídeo do app com perfil "Ciclano da Silva" para candidato "Fulano de Tal" → `videoApp.status = 'rejeitado'`, motivo correto

---

### P1: `validacaoIA` com divergências críticas deve bloquear aprovação final

**User Story**: Como sistema, mesmo que algum documento individual passe, divergências nas verificações de identidade devem impedir `statusDocumentos = APROVADO`.

**Acceptance Criteria**:

1. WHEN `validacaoIA.nomeCadastroConfere === false` THEN `statusDocumentos` SHALL ser `PENDENCIA`
2. WHEN `validacaoIA.nomeConfere === false` (CNH vs app divergem) THEN `statusDocumentos` SHALL ser `PENDENCIA`
3. WHEN `validacaoIA.cpfConfere === false` THEN `statusDocumentos` SHALL ser `PENDENCIA` (já existente — verificar que está funcionando)

**Independent Test**: Forçar no MongoDB `validacaoIA.nomeCadastroConfere = false` com todos os docs aprovados → status final deve ser `PENDENCIA`

---

## Edge Cases

- "João Silva" vs "Joao Silva" (sem acento) → similaridade >= 85% → aprovar
- "Maria S. Lima" vs "Maria Santos Lima" → similaridade >= 85% → aprovar  
- "Fulano de Tal" vs "Ciclano da Silva" → similaridade < 85% → rejeitar
- Nome extraído do app com emoji ou caracteres especiais → normalizar antes de comparar
- `nomePerfil` retornado como string vazia `""` → tratar como null, não rejeitar

---

## Success Criteria

- [ ] Caso original reportado (Fulano vs Ciclano na CNH) resulta em CNH rejeitada + PENDENCIA
- [ ] Caso original reportado (Fulano vs Ciclano no app) resulta em videoApp rejeitado + PENDENCIA
- [ ] Nomes com variações aceitáveis (acentuação, abreviação) continuam aprovando
- [ ] Motivo de rejeição exibido corretamente no portal para cada documento
- [ ] Nenhuma regressão em fluxos legítimos de aprovação
