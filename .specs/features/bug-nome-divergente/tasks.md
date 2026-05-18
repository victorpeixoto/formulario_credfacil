# [BUG] Nomes divergentes — Tasks

**Spec**: `.specs/features/bug-nome-divergente/spec.md`  
**Design**: `.specs/features/bug-nome-divergente/design.md`  
**Arquivo central**: `app/api/validacao/iniciar/route.ts`

---

## Execution Plan

Todas as tasks são no mesmo arquivo e sequenciais por segurança.

```
T1 → T2 → T3 → T4 (validação)
```

---

## Task Breakdown

### T1: Diagnosticar — confirmar causa raiz com logs

**What**: Adicionar logs diagnósticos para confirmar o valor de `cadastro.nomeCompleto` e `aprovado` no momento do cruzamento
**Where**: `app/api/validacao/iniciar/route.ts`, função `executarPipeline`
**Depends on**: None

**O que fazer**:
- Adicionar `console.log` do `cadastro` completo logo após ser montado (~linha 60)
- Confirmar que `let { aprovado, motivo }` está correto (não `const`)
- Confirmar o valor de `sim` no bloco else-if do nome da CNH

**Done when**:
- [ ] Log mostra `cadastro.nomeCompleto` com valor correto ou vazio
- [ ] Causa raiz confirmada: variável vazia, bug de const/let, ou lógica errada
- [ ] `npm run build` compila

**Verify**: Fazer submit de validação de teste e checar logs do servidor

---

### T2: Corrigir verificação de nome da CNH

**What**: Garantir que divergência de nome entre CNH e cadastro resulta em `cnh.status = 'rejeitado'`
**Where**: `app/api/validacao/iniciar/route.ts`, bloco `if (aprovado && tipo === 'cnh')`
**Depends on**: T1 (diagnóstico confirmado)

**O que fazer**:
- Adicionar guard `if (cadastro.nomeCompleto && dados.nome)` antes da comparação
- Garantir que `aprovado = false` e `motivo` são setados corretamente
- Remover cálculo duplicado de `sim` (a variável é calculada na condição E dentro do bloco)
- Adicionar log do valor de `sim` para observabilidade em produção

**Código resultado**:
```typescript
if (aprovado && tipo === 'cnh') {
  const dados = dadosExtraidos as Record<string, unknown>;
  const cpfCNH = String(dados.cpf ?? '').replace(/\D/g, '');
  const cpfCad = cadastro.cpf.replace(/\D/g, '');
  
  console.log(`[cruzamento] CNH: nome="${dados.nome}" | cadastro: nome="${cadastro.nomeCompleto}" cpf="${cpfCad}"`);
  
  if (cpfCNH && cpfCNH !== cpfCad) {
    aprovado = false;
    motivo = 'CPF da CNH não confere com o cadastro';
    console.log(`[cruzamento] CNH rejeitada: CPF divergente`);
  } else if (cadastro.nomeCompleto && dados.nome) {
    const sim = calcularSimilaridade(String(dados.nome), cadastro.nomeCompleto);
    console.log(`[cruzamento] CNH nome: "${dados.nome}" vs "${cadastro.nomeCompleto}" → ${sim}%`);
    if (sim < 85) {
      aprovado = false;
      motivo = 'Nome da CNH não confere com o cadastro';
    }
  }
}
```

**Done when**:
- [ ] CNH com nome completamente diferente → `status: 'rejeitado'`, motivo correto
- [ ] CNH com nome similar (acentuação) → `status: 'aprovado'`
- [ ] `npm run build` compila sem erros

**Verify**: Testar com mock de Gemini retornando nome divergente e nome similar

---

### T3: Adicionar verificação de nome para vídeo do app

**What**: Implementar cruzamento de `videoApp.nomePerfil` vs `cadastro.nomeCompleto` no processamento individual
**Where**: `app/api/validacao/iniciar/route.ts`, após o bloco de resultado de `videoApp`
**Depends on**: T2

**O que fazer**:
- Adicionar bloco `if (aprovado && tipo === 'videoApp')` após o processamento existente
- Comparar `nomePerfil` extraído com `cadastro.nomeCompleto`
- Aplicar mesma tolerância: similaridade >= 85%
- Guard para `nomePerfil` nulo/vazio

**Código a adicionar** (após o bloco de biometria existente, dentro do loop `for`):
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

**Done when**:
- [ ] Vídeo com perfil de nome diferente → `status: 'rejeitado'`, motivo correto
- [ ] Vídeo com nome similar → `status: 'aprovado'`
- [ ] `nomePerfil` null → não rejeita (guard funciona)
- [ ] `npm run build` compila

**Verify**: Testar com resultado mockado de videoApp com `nomePerfil` divergente e similar

---

### T4: Bloquear status APROVADO quando `validacaoIA` indica divergência de identidade

**What**: Modificar determinação do `statusDocumentos` final para considerar campos de `validacaoIA`
**Where**: `app/api/validacao/iniciar/route.ts`, bloco após `cruzarDados` (~linha 249)
**Depends on**: T3

**O que fazer**:
- Após calcular `validacaoIA`, verificar se há divergências críticas de identidade
- Incluir verificação de `nomeCadastroConfere`, `nomeConfere` e `cpfConfere` na determinação de status

**Código resultado**:
```typescript
const validacaoIA = cruzarDados(resultadosParaCruzamento as Parameters<typeof cruzarDados>[0], cadastro);

// Verificar divergências críticas de identidade no cruzamento final
const divergenciaIdentidade =
  validacaoIA.nomeCadastroConfere === false ||
  validacaoIA.nomeConfere === false ||
  validacaoIA.cpfConfere === false;

if (divergenciaIdentidade) {
  console.log(`[cruzamento] Divergência de identidade detectada:`, {
    nomeCadastroConfere: validacaoIA.nomeCadastroConfere,
    nomeConfere: validacaoIA.nomeConfere,
    cpfConfere: validacaoIA.cpfConfere,
  });
}

// ... (código de rejeição de placa existente) ...

// Determinar status final
// ...
if (todosAprovados && !algumRejeitado && !divergenciaIdentidade) {
  statusDocumentos = 'APROVADO';
} else if (algumRejeitado || divergenciaIdentidade) {
  const precisaAnalise = statusDocs.some(
    (t) => todosDocs[t]?.status === 'rejeitado' && (todosDocs[t]?.tentativas ?? 0) >= 3
  );
  // ... resto da lógica existente ...
}
```

**Done when**:
- [ ] `validacaoIA.nomeCadastroConfere = false` → `statusDocumentos = 'PENDENCIA'` mesmo com docs individualmente aprovados
- [ ] `validacaoIA.nomeConfere = false` → `statusDocumentos = 'PENDENCIA'`
- [ ] `validacaoIA.cpfConfere = false` → `statusDocumentos = 'PENDENCIA'`
- [ ] Quando todos os campos relevantes são `null` (dados não disponíveis) → não bloquear
- [ ] `npm run build` compila

**Verify**: Cenário end-to-end: nome "Fulano de Tal" no cadastro + CNH "Ciclano da Silva" → PENDENCIA

---

## Caso de Teste Obrigatório (da task do ClickUp)

Antes de marcar como resolvido, executar o cenário original reportado:

```
Candidato cadastrado: nome = "Fulano de Tal"
Documento enviado: CNH com nome "Ciclano da Silva"
Documento enviado: vídeo app com perfil "Ciclano da Silva"

Resultado esperado:
  - documentos.cnh.status = 'rejeitado'
  - documentos.cnh.resultado.motivo = 'Nome da CNH não confere com o cadastro'
  - documentos.videoApp.status = 'rejeitado'
  - documentos.videoApp.resultado.motivo = 'Nome do perfil no app não confere com o cadastro'
  - statusDocumentos = 'PENDENCIA'
```

---

## Task Granularity Check

| Task | Escopo | Estimativa |
|---|---|---|
| T1: Diagnóstico | Logs diagnósticos | 15 min |
| T2: Fix CNH | ~10 linhas alteradas | 20 min |
| T3: Fix videoApp | ~10 linhas novas | 20 min |
| T4: Fix status final | ~10 linhas alteradas | 20 min |
| **Total** | 1 arquivo | **~75 min** |
