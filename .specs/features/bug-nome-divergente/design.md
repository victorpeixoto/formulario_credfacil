# [BUG] Nomes divergentes — Design

**Spec**: `.specs/features/bug-nome-divergente/spec.md`

---

## Diagnóstico técnico detalhado

### Arquivo principal: `app/api/validacao/iniciar/route.ts`

#### Problema 1 — Bloco de nome da CNH não funciona (linha ~137)

```typescript
// Código atual — BUGADO
let { aprovado, motivo } = resultado.value;  // let correto
const { dadosExtraidos } = resultado.value;

// ...
if (aprovado && tipo === 'cnh') {
  const dados = dadosExtraidos as Record<string, unknown>;
  const cpfCNH = String(dados.cpf ?? '').replace(/\D/g, '');
  const cpfCad = cadastro.cpf.replace(/\D/g, '');
  if (cpfCNH && cpfCNH !== cpfCad) {
    aprovado = false;  // OK — CPF já funciona
    motivo = 'CPF da CNH não confere com o cadastro';
  } else if (dados.nome && calcularSimilaridade(String(dados.nome), cadastro.nomeCompleto) < 85) {
    const sim = calcularSimilaridade(String(dados.nome), cadastro.nomeCompleto);  // ← calcula SIM mas não usa!
    aprovado = false;  // ← variável local — mas `aprovado` foi reatribuído? Verificar
    motivo = 'Nome da CNH não confere com o cadastro';
    console.log(`...`);
  }
}
```

Inspecionando novamente: `let { aprovado, motivo } = resultado.value` — `aprovado` é `let`, então a reatribuição deveria funcionar. O bug pode ser outro: a linha `const sim = calcularSimilaridade(...)` **recalcula a similaridade** mas o condicional já usou `calcularSimilaridade(...)` na condição — redundante mas não causa bug. 

O bug real parece ser de **ordem**: o log mostra `aprovado = false` sendo setado, mas observe que o `updateStatus` usa `aprovado` depois. Se a variável está sendo reatribuída corretamente, o problema pode ser que o candidato tem `nomeCompleto` vazio no MongoDB, fazendo `calcularSimilaridade(cnhNome, '')` retornar 0, o que dispararia a rejeição (não seria o bug), OU `nomeCompleto` não está no `cadastro` porque veio de `candidato?.nomeCompleto ?? ''`.

**Verificar**: logar `cadastro.nomeCompleto` no início da pipeline para confirmar o valor real sendo comparado.

#### Problema 2 — Vídeo do app não tem verificação de nome vs cadastro

Não existe nenhum bloco equivalente para `videoApp`. Após `tipo === 'videoApp'` ser processado e `dadosExtraidos.nomePerfil` ser extraído, nenhuma comparação com `cadastro.nomeCompleto` ocorre.

#### Problema 3 — Status final ignora `validacaoIA`

```typescript
// Código atual — INCOMPLETO
const algumRejeitado = statusDocs.some(t => todosDocs[t]?.status === 'rejeitado');
const todosAprovados = statusDocs.every(t => todosDocs[t]?.status === 'aprovado');

if (todosAprovados && !algumRejeitado) {
  statusDocumentos = 'APROVADO';  // ← não considera validacaoIA
}
```

---

## Solução

### Mudança 1: Corrigir bloco de nome da CNH

Adicionar log de diagnóstico e garantir que `aprovado = false` está sendo aplicado. Também logar `cadastro.nomeCompleto` para confirmar o valor.

**Arquivo**: `app/api/validacao/iniciar/route.ts`

```typescript
if (aprovado && tipo === 'cnh') {
  const dados = dadosExtraidos as Record<string, unknown>;
  const cpfCNH = String(dados.cpf ?? '').replace(/\D/g, '');
  const cpfCad = cadastro.cpf.replace(/\D/g, '');
  
  console.log(`[cruzamento] CNH: nome="${dados.nome}" cpf="${cpfCNH}" | cadastro: nome="${cadastro.nomeCompleto}" cpf="${cpfCad}"`);
  
  if (cpfCNH && cpfCNH !== cpfCad) {
    aprovado = false;
    motivo = 'CPF da CNH não confere com o cadastro';
  } else if (cadastro.nomeCompleto && dados.nome) {
    const sim = calcularSimilaridade(String(dados.nome), cadastro.nomeCompleto);
    console.log(`[cruzamento] CNH nome similarity: ${sim}%`);
    if (sim < 85) {
      aprovado = false;
      motivo = 'Nome da CNH não confere com o cadastro';
    }
  }
}
```

### Mudança 2: Adicionar verificação de nome para vídeo do app

Após o resultado do `videoApp` ser processado:

```typescript
if (aprovado && tipo === 'videoApp') {
  const dados = dadosExtraidos as Record<string, unknown>;
  const nomePerfil = String(dados.nomePerfil ?? '').trim();
  
  if (nomePerfil && cadastro.nomeCompleto) {
    const sim = calcularSimilaridade(nomePerfil, cadastro.nomeCompleto);
    console.log(`[cruzamento] videoApp nomePerfil="${nomePerfil}" vs cadastro="${cadastro.nomeCompleto}" → ${sim}%`);
    if (sim < 85) {
      aprovado = false;
      motivo = 'Nome do perfil no app não confere com o cadastro';
    }
  }
}
```

### Mudança 3: Status final deve considerar `validacaoIA`

```typescript
// Após calcular validacaoIA e antes de determinar statusDocumentos
const divergenciaIdentidade = 
  validacaoIA.nomeCadastroConfere === false ||
  validacaoIA.nomeConfere === false ||
  validacaoIA.cpfConfere === false;

if (todosAprovados && !algumRejeitado && !divergenciaIdentidade) {
  statusDocumentos = 'APROVADO';
} else if (algumRejeitado || divergenciaIdentidade) {
  // lógica existente de PENDENCIA/ANALISE_MANUAL
}
```

---

## Arquivos modificados

| Arquivo | Tipo de mudança |
|---|---|
| `app/api/validacao/iniciar/route.ts` | Bugfix — 3 modificações localizadas |

Nenhuma mudança em tipos, componentes ou outras APIs.

---

## Riscos

- `cadastro.nomeCompleto` pode estar vazio para candidatos antigos → adicionar guard `if (cadastro.nomeCompleto && dados.nome)` (já no design acima)
- `nomePerfil` extraído pelo Gemini pode ter formatação inconsistente → normalizar com `.trim()` e deixar Levenshtein absorver variações menores
- Threshold 85% pode ser muito restritivo para alguns nomes válidos → manter o valor atual (já testado no cruzamento final existente) e ajustar após feedback

## Teste de validação

Cenário obrigatório antes de considerar resolvido:
1. Candidato com `nomeCompleto = "Fulano de Tal"` no MongoDB
2. Upload de CNH com Gemini retornando `nome = "Ciclano da Silva"`
3. Resultado esperado: `cnh.status = 'rejeitado'`, motivo correto, `statusDocumentos = 'PENDENCIA'`

Cenário de não-regressão:
1. Candidato com `nomeCompleto = "João Silva"`
2. CNH com `nome = "Joao Silva"` (sem acento)
3. Resultado esperado: aprovado (similaridade > 85%)
