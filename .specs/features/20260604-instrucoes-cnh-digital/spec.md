# CNH: PDF obrigatório (CNH Digital) + validade mínima de 30 dias — Especificação

**Data:** 2026-06-04
**Status:** Aguardando aprovação
**ClickUp:** [86ahw4m0p](https://app.clickup.com/t/86ahw4m0p) (instrução) · relacionada: [86ahw4m6u](https://app.clickup.com/t/86ahw4m6u) (validade > 30 dias)
**Branch sugerida:** `feature/cnh-pdf-obrigatorio-validade-30d`
**Feature de origem:** `validacao-documentos-ia`

> Consolida a CNH num único card. A spec separada de "PDF obrigatório" (`86ahw4ktu`) foi descartada e seu enforcement foi absorvido aqui.

---

## Problema

Dois problemas na CNH:

1. **Qualidade:** fotos da CNH (reflexo, sombra, cortes) dificultam a conferência da IA. O padrão correto é exigir o **PDF do app CNH Digital** (Carteira Digital de Trânsito), padronizado e limpo.
2. **Validade:** hoje a CNH só é reprovada quando **já está vencida**. CNHs prestes a vencer passam, o que é indesejado para a análise — é preciso exigir uma **margem mínima de 30 dias** de validade.

## Goals

- [ ] Orientar (cópia) a **obrigatoriedade** do PDF do app CNH Digital.
- [ ] Fazer a captura aceitar **apenas PDF** para a CNH.
- [ ] Exigir **pelo menos 30 dias** de validade da CNH na data da análise; reprovar com mensagem clara quando faltar menos.

## Out of Scope

- Não alterar a validação de outros documentos.
- Não alterar thresholds de cruzamento/identidade.
- Foto da CNH deixa de ser aceita (exceções tratadas no atendimento).

---

## User Stories

### P1: PDF obrigatório do app CNH Digital ⭐ MVP

**User Story**: Como candidato, quero ser orientado a enviar a CNH em PDF do app CNH Digital, e que o envio aceite apenas esse formato, para evitar reprovações por qualidade de foto.

**Acceptance Criteria**:

1. WHEN o candidato chega na etapa da CNH THEN a UI SHALL orientar que o envio em **PDF do app CNH Digital** é **obrigatório** e explicar como exportar.
2. WHEN a captura da CNH é exibida THEN ela SHALL aceitar **apenas** `.pdf` e NÃO oferecer a opção de foto/câmera.
3. WHEN a CNH em PDF é enviada THEN o pipeline SHALL processá-la pelo caminho de PDF existente (`pdf-to-img`) sem erro, inclusive multipágina.
4. WHEN a cópia é atualizada THEN ela SHALL ser consistente entre o título/subtítulo da etapa e as dicas da captura.

**Independent Test**: Tentar enviar imagem na etapa da CNH → não aceita. Enviar PDF da CNH Digital → processa.

---

### P1: Validade mínima de 30 dias ⭐ MVP

**User Story**: Como analista, quero que CNHs com menos de 30 dias para vencer sejam recusadas, para não aprovar documentos prestes a expirar.

**Acceptance Criteria**:

1. WHEN a validade da CNH é avaliada THEN o sistema SHALL exigir **pelo menos 30 dias** de validade contados da data de análise.
2. WHEN a CNH tem menos de 30 dias para vencer (mas ainda não venceu) THEN o sistema SHALL **reprovar** informando que está **próxima do vencimento** e que são necessários **30 dias** de validade.
3. WHEN a CNH já está vencida THEN o sistema SHALL reprovar com o motivo "CNH vencida".
4. WHEN a data de validade não é identificada THEN o sistema SHALL reprovar com o motivo "Data de validade não identificada".
5. WHEN a CNH tem 30 dias ou mais de validade THEN a regra de validade SHALL ser considerada atendida.

**Independent Test**: PDF de CNH com validade em 40 dias → passa na regra de validade; em 10 dias → reprova "próxima do vencimento, 30 dias"; vencida → "CNH vencida".

---

## Edge Cases

- WHEN o PDF da CNH Digital tem múltiplas páginas THEN o sistema SHALL processá-las sem travar.
- WHEN a CNH em PDF não gera preview de imagem THEN a UI SHALL exibir nome/tamanho do arquivo (comportamento atual) sem quebrar.
- WHEN a validade está exatamente em 30 dias THEN SHALL ser considerada válida (limite inclusivo de 30 dias mínimos).
- WHEN o candidato não tem o app CNH Digital THEN a exceção SHALL ser tratada no atendimento (a captura não aceita foto).

---

## Success Criteria

- [ ] Instruções comunicam o PDF do app CNH Digital como obrigatório.
- [ ] Captura da CNH aceita somente PDF; opção de foto removida (apenas para a CNH).
- [ ] CNH com menos de 30 dias de validade é recusada com mensagem clara.
- [ ] Threshold de 30 dias centralizado em `config.ts`.
- [ ] Cópia consistente entre etapa e captura.

---

## Decisão em aberto

- **Exceção para quem não tem a CNH Digital:** bloquear foto totalmente (default) ou permitir foto como exceção com aviso? A cópia e o `accept` da captura dependem dessa decisão.
