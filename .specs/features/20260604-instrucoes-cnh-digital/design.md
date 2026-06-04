# CNH: PDF obrigatório (CNH Digital) + validade mínima de 30 dias — Design

**Data:** 2026-06-04
**Spec:** [spec.md](./spec.md)
**ClickUp:** [86ahw4m0p](https://app.clickup.com/t/86ahw4m0p) (instrução) · relacionada: [86ahw4m6u](https://app.clickup.com/t/86ahw4m6u) (validade > 30 dias)

> **Consolidação:** a spec separada de "PDF obrigatório" (`86ahw4ktu`) foi descartada; o enforcement do PDF foi absorvido aqui. Este card cobre, para a CNH: (1) instrução de PDF obrigatório, (2) captura aceitando só PDF, (3) regra de validade ≥ 30 dias.

---

## Arquivos

| Papel | Arquivo / âncora |
|---|---|
| Título/subtítulo da etapa CNH (cópia) | [app/(auth)/documentos/page.tsx](../../../app/(auth)/documentos/page.tsx) — `TITULOS.cnh` (~25-28) |
| Dicas + input de arquivo (cópia + accept) | [components/captura/captura-documento.tsx](../../../components/captura/captura-documento.tsx) — `CONFIG.cnh` + inputs (~115-135) |
| Validação da CNH (validade) | [lib/ai/validacoes/cnh.ts](../../../lib/ai/validacoes/cnh.ts) |
| Threshold centralizado | [lib/ai/pipeline/config.ts](../../../lib/ai/pipeline/config.ts) |

## 1. Instrução: PDF obrigatório do app CNH Digital (cópia)

**Subtítulo da etapa** (`TITULOS.cnh`):
> "Envie sua CNH em **PDF**, exportado do app **CNH Digital** (Carteira Digital de Trânsito). É o formato que garante a leitura correta dos seus dados."

**Dicas** (`CONFIG.cnh.dicas`):
- "Abra o app **CNH Digital** e exporte sua CNH como **PDF**."
- "Envie o **PDF** aqui — é o formato exigido para a conferência."
- "Confira que nome, CPF e validade aparecem no documento."

Remover o tom de alternativa "foto ou PDF".

## 2. Enforcement: captura aceita só PDF (`captura-documento.tsx`)

- Para o tipo `cnh`, o input de arquivo deve aceitar **apenas** `.pdf` (hoje é `image/*,.pdf`, linha 129) e **não** exibir o botão de "Tirar foto agora"/câmera para a CNH.
- Manter o limite de 50MB e o preview por nome/tamanho para PDF (linhas 56-73).
- Exceção de quem não tem CNH Digital: tratada no atendimento (a captura não aceita foto). Ver decisão em aberto na spec.

> ⚠️ `captura-documento.tsx` é compartilhado com o comprovante. A restrição a só-PDF deve valer **apenas** para `tipo === 'cnh'`; o comprovante mantém `image/*,.pdf`.

## 3. Regra de validade: mínimo de 30 dias (`cnh.ts` + `config.ts`)

Estado atual em `cnh.ts` (só reprova se já vencida):
```ts
if (dados.validade) {
  const validade = new Date(dados.validade);
  if (validade < new Date()) return reprovar('CNH vencida');
} else {
  return reprovar('Data de validade não identificada');
}
```

Nova regra — exigir **pelo menos 30 dias** de validade a partir da data de análise:
```ts
// config.ts
export const DIAS_MINIMOS_VALIDADE_CNH = 30;

// cnh.ts
const hoje = new Date();
const limiteMinimo = new Date();
limiteMinimo.setDate(hoje.getDate() + DIAS_MINIMOS_VALIDADE_CNH);

if (validade < hoje) {
  return reprovar('CNH vencida');
}
if (validade < limiteMinimo) {
  return reprovar('CNH próxima do vencimento. É necessário pelo menos 30 dias de validade na data da análise.');
}
```
- Mantém o motivo de "Data de validade não identificada".
- Threshold centralizado em `config.ts` (convenção do projeto — nada de número mágico em `cnh.ts`).

## Testes

- Unit (`node --test`): fixture de `cnh.ts` com validade > 30 dias → aprova; validade em 10 dias → reprova com motivo "próxima do vencimento"; já vencida → "CNH vencida"; sem validade → "não identificada".
- `npm test` verde (sem regressão).
- Manual: enviar imagem na etapa da CNH → não aceita; PDF da CNH Digital com validade > 30 dias → aprova; PDF com validade em < 30 dias → reprova informando os 30 dias.
