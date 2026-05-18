# Documento de Implementação — Consolidação: `validacao-documentos-ia`

**Data:** 2026-05-18  
**Status:** Aguardando aprovação  
**Branch:** `validacao-documentos-ia`

---

## 1. Contexto e Objetivo

Este documento consolida os requisitos de negócio fornecidos pelo cliente com o estado atual do código, mapeando as lacunas e o que precisa ser implementado/ajustado para que a validação automática reflita fielmente o processo manual já realizado pela equipe Credfácil.

---

## 2. Regras de Negócio (fonte: cliente)

### 2.1 CNH
- Nome e CPF da CNH **devem** ser iguais ao do cadastro.
- Hoje: ✅ já implementado em `iniciar/route.ts` (cruzamento em tempo real, linhas 131–149).

### 2.2 Comprovante de Residência
**Validações obrigatórias (ambos os cenários):**
- O **endereço** do comprovante deve conferir com o endereço do cadastro do candidato (logradouro, número, bairro, cidade, UF, CEP — critério: ≥ 70% dos campos presentes conferem).
- O comprovante deve ter sido emitido há menos de 90 dias.
- O documento deve estar legível e sem cortes.

**Cenário A — comprovante no nome do candidato:** nome deve bater com o cadastro (similaridade ≥ 85%) + endereço confere → aprovação automática.

**Cenário B — comprovante no nome de outra pessoa (proprietário):** endereço ainda deve conferir com o cadastro. Se conferir, o candidato deve enviar documento complementar (CNH/RG/certidão de casamento do titular).
- Neste caso, o registro vai para **análise manual** e o botão do WhatsApp é liberado.
- Se o endereço **não** conferir → rejeição normal (documento inválido).

**Hoje:**
- ✅ Validação de endereço já implementada em `iniciar/route.ts` (linhas 152–169) e `cruzamento.ts`.
- ❌ Fluxo de exceção para nome de terceiro não implementado — o sistema rejeita em vez de encaminhar para análise manual.

### 2.3 Selfie da Placa
- A placa da selfie deve ser a **mesma** do vídeo do app e do vídeo do veículo.
- Hoje: ✅ já implementado via cruzamento final em `cruzamento.ts` (≥ 2/3 fontes concordam).

### 2.4 Vídeo do APP
O vídeo precisa mostrar **tudo abaixo**, sem cortes, em formato mensal (mês a mês):
| Campo obrigatório | Regra de negócio |
|---|---|
| Perfil com nome e foto | Nome deve bater com o cadastro |
| Placa cadastrada no app | Deve coincidir com selfie e vídeo do veículo |
| Ganhos últimos 6 meses | **Mínimo R$ 3.500/mês** em cada um dos 6 meses, formato mês a mês |
| Tempo de uso no app | Apenas extrair/registrar |
| Total de corridas/viagens | Apenas extrair/registrar |
| Formato proibido | Ganhos diários, semanais, vídeo cortado ou incompleto |

- **Hoje:** ❌ parcialmente implementado. O Gemini extrai `faturamento180d` como texto livre; não há parser de valor mensal nem validação do mínimo de R$ 3.500/mês.

### 2.5 Vídeo do Veículo
- Deve mostrar a **placa** e o veículo em funcionamento.
- A placa deve coincidir com o vídeo do app e a selfie.
- Hoje: ✅ extração da placa e verificação de veículo ligado já implementados.

---

## 3. Gaps vs. Código Atual

| # | Gap | Arquivo(s) afetado(s) | Prioridade |
|---|---|---|---|
| G1 | Comprovante em nome de terceiro → deve ir para análise manual + liberar WhatsApp, não rejeitar (endereço ainda deve conferir; apenas o nome pode ser de terceiro) | `comprovante.ts`, `cruzamento.ts`, `iniciar/route.ts`, `status/page.tsx` | Alta |
| G2 | Vídeo do app não valida faturamento mínimo (R$3.500/mês × 6 meses) nem formato mensal | `video-app.ts`, `iniciar/route.ts` | Alta |
| G3 | Vídeo do app não verifica se exibe ganhos diários/semanais (formato proibido) | `video-app.ts` | Alta |
| G4 | Vídeo do app não verifica campos visuais obrigatórios: foto de perfil, placa no app | `video-app.ts` | Média |
| G5 | `ValidacaoIA` não possui campo `comprovanteNomeDivergente` para distinguir divergência de nome por terceiro | `types/documentos.ts`, `cruzamento.ts` | Alta |
| G6 | UI não exibe o fluxo "comprovante de terceiro": instrução para enviar doc complementar + botão WhatsApp | `status/page.tsx`, componentes relacionados | Alta |

---

## 4. Plano de Implementação

### 4.1 G5 — Novo campo no tipo `ValidacaoIA`
**Arquivo:** [types/documentos.ts](../formulario-credfacil/types/documentos.ts)

Adicionar:
```ts
comprovanteNomeDivergente: boolean | null;
// true = nome do comprovante ≠ nome do cadastro (possível terceiro)
```

---

### 4.2 G1 — Lógica de comprovante em nome de terceiro

**Arquivo:** [lib/ai/validacoes/comprovante.ts](../formulario-credfacil/lib/ai/validacoes/comprovante.ts)

A validação do comprovante **não deve** reprovar automaticamente por nome divergente. Deve retornar `aprovado: true` e um campo auxiliar `nomeDivergente: true` quando o nome não bater — permitindo que a camada de cruzamento decida o fluxo.

Alterar retorno de `validarComprovante`:
```ts
// Adicionar ao retorno:
nomeDivergente: boolean;
```

Remover a rejeição por nome divergente do comprovante de dentro de `validarComprovante` (a função hoje não verifica nome, mas o `iniciar/route.ts` sim — ver item abaixo).

---

**Arquivo:** [app/api/validacao/iniciar/route.ts](../formulario-credfacil/app/api/validacao/iniciar/route.ts) — linhas 152–169

Atualmente o cruzamento do comprovante rejeita automaticamente se o endereço não confere. Manter essa lógica para **endereço**. Para o **nome**, a lógica muda:

```
SE nome do comprovante ≠ nome do cadastro:
  → NÃO rejeitar o documento
  → Marcar status = 'aprovado' (ou novo status 'pendente_complementar')
  → Setar flag comprovanteNomeDivergente = true no documento
  → Registrar motivo para exibição na UI
```

A decisão de fluxo (análise manual) acontece na determinação do `statusDocumentos` final:
```
SE comprovanteNomeDivergente = true:
  → statusDocumentos = 'ANALISE_MANUAL'
  → liberar botão WhatsApp (já ocorre para ANALISE_MANUAL)
  → NÃO bloquear candidato — ele só precisa levar o doc do titular
```

---

**Arquivo:** [lib/ai/cruzamento.ts](../formulario-credfacil/lib/ai/cruzamento.ts)

Adicionar ao resultado de `cruzarDados`:
```ts
comprovanteNomeDivergente: boolean | null;
```
Calcular: `true` quando `comp.nome` existe e similaridade com `cadastro.nomeCompleto` < 85%.

---

### 4.3 G2 + G3 + G4 — Validação do Vídeo do App

**Arquivo:** [lib/ai/validacoes/video-app.ts](../formulario-credfacil/lib/ai/validacoes/video-app.ts)

#### Novo prompt Gemini — campos adicionais:
```
8. O vídeo mostra os ganhos em formato MENSAL (mês a mês)? Ou mostra ganhos diários/semanais (formato inválido)?
9. Extraia os ganhos mês a mês dos últimos 6 meses como array de objetos {mes: "YYYY-MM", valor: number}.
   Se não for possível extrair mês a mês (apenas total ou por dia/semana), retorne formatoGanhos = "invalido".
10. A foto do perfil do candidato aparece visível no vídeo?
11. A placa do veículo está visível no app (cadastrada no perfil)?

Responda APENAS em JSON:
{
  "nomePerfil": "...",
  "placa": "...",
  "faturamento180d": "...",
  "ganhosMensais": [{"mes": "YYYY-MM", "valor": 3800}, ...],
  "formatoGanhos": "mensal" | "invalido" | "nao_identificado",
  "fotoPerfilVisivel": true,
  "tempoUso": "...",
  "totalCorridas": "...",
  "temCortes": false,
  "motivoCortes": null,
  "aplicativo": "..."
}
```

#### Novo tipo `ResultadoVideoApp`:
```ts
ganhosMensais: Array<{ mes: string; valor: number }> | null;
formatoGanhos: 'mensal' | 'invalido' | 'nao_identificado' | null;
fotoPerfilVisivel: boolean | null;
```

#### Regras de validação em `validarVideoApp`:
```
SE formatoGanhos = 'invalido':
  → aprovado = false, motivo = 'Ganhos não estão no formato mensal (mês a mês). Não envie ganhos diários ou semanais.'

SE ganhosMensais não null E length >= 6:
  → verificar se TODOS os 6 meses têm valor >= 3500
  → SE algum mês < 3500:
    → aprovado = false, motivo = 'Faturamento mensal abaixo de R$ 3.500 em um ou mais meses dos últimos 6 meses.'
  → SE menos de 6 meses disponíveis:
    → aprovado = false, motivo = 'Vídeo não mostra os ganhos dos últimos 6 meses completos.'
```

---

### 4.4 G6 — UI: fluxo comprovante de terceiro

**Arquivo:** [app/(auth)/status/page.tsx](../formulario-credfacil/app/(auth)/status/page.tsx)

Quando `statusFinal === 'ANALISE_MANUAL'` E `validacaoIA.comprovanteNomeDivergente === true`:

Exibir mensagem específica ao candidato:
> "Identificamos que seu comprovante de residência está no nome de outra pessoa. Para continuar, envie via WhatsApp: a CNH, RG ou certidão de casamento do titular do comprovante. Nossa equipe irá analisar e dar continuidade."

O botão do WhatsApp já é liberado em `ANALISE_MANUAL` — apenas adicionar contexto visual para este caso específico.

---

## 5. Mudanças Resumidas por Arquivo

| Arquivo | Tipo | Descrição |
|---|---|---|
| [types/documentos.ts](../formulario-credfacil/types/documentos.ts) | Refatoração | Adicionar `comprovanteNomeDivergente` em `ValidacaoIA`; adicionar campos em `ResultadoVideoApp` |
| [lib/ai/validacoes/comprovante.ts](../formulario-credfacil/lib/ai/validacoes/comprovante.ts) | Refatoração | Adicionar `nomeDivergente` ao retorno; não reprovar por nome (endereço mantém) |
| [lib/ai/validacoes/video-app.ts](../formulario-credfacil/lib/ai/validacoes/video-app.ts) | Refatoração | Novo prompt + campos; validar faturamento mínimo R$3.500/mês × 6 meses; bloquear formato inválido |
| [lib/ai/cruzamento.ts](../formulario-credfacil/lib/ai/cruzamento.ts) | Refatoração | Calcular e retornar `comprovanteNomeDivergente` |
| [app/api/validacao/iniciar/route.ts](../formulario-credfacil/app/api/validacao/iniciar/route.ts) | Refatoração | Cruzamento do comprovante: separar lógica de endereço e nome; sinalizar divergência sem rejeitar; incluir `comprovanteNomeDivergente` no `statusDocumentos` final |
| [app/(auth)/status/page.tsx](../formulario-credfacil/app/(auth)/status/page.tsx) | Feature | Exibir mensagem contextual quando `ANALISE_MANUAL` por comprovante de terceiro |

---

## 6. Fluxo Atualizado — Comprovante de Terceiro

```
Candidato envia comprovante em nome do proprietário
        ↓
IA extrai nome e endereço do comprovante
        ↓
Endereço confere com cadastro? (≥ 70% dos campos)
  NÃO → Rejeitar: "Endereço do comprovante não confere com o cadastro"
        ↓
Nome ≠ nome do cadastro (sim) + endereço OK
        ↓
comprovanteNomeDivergente = true
Documento marcado como aprovado (endereço conferiu)
        ↓
statusDocumentos = ANALISE_MANUAL
        ↓
UI: Mensagem explicativa + botão WhatsApp liberado
        ↓
Equipe Credfácil recebe candidato no WhatsApp
solicita CNH/RG/certidão do titular
        ↓
Análise manual e liberação
```

---

## 7. Fluxo Atualizado — Vídeo do App

```
Candidato envia vídeo do app
        ↓
Gemini analisa: extrai ganhos mês a mês, verifica formato
        ↓
Formato inválido (diário/semanal)?
  → Rejeitar: "Não envie ganhos diários ou semanais"
        ↓
Menos de 6 meses visíveis?
  → Rejeitar: "Mostre os últimos 6 meses completos"
        ↓
Algum mês < R$ 3.500?
  → Rejeitar: "Faturamento abaixo do mínimo em X meses"
        ↓
Todos ≥ R$ 3.500 × 6 meses → OK
        ↓
Cruzar placa com selfie e vídeo do veículo (já existente)
        ↓
Aprovado
```

---

## 8. Fora de Escopo (não implementar agora)

- Upload de documento complementar do titular do comprovante via portal.
- Parser de certidão de casamento pela IA.
- Fluxo de reenvio automático do comprovante após análise manual.

---

## 9. Notas Técnicas

- O campo `motivo` da rejeição do vídeo do app **deve** ser direto e em português, pois é exibido ao candidato na UI.
- O `ganhosMensais` deve ser parseado como array numérico no prompt — pedir ao Gemini explicitamente `"valor": number` (não string) para evitar parsing extra.
- Testar com vídeos reais que mostrem apenas faturamento diário (caso mais comum de reenvio) para calibrar o prompt antes de ir a produção.
