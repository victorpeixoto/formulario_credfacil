# State

**Last updated:** 2026-03-28
**Session:** Inicialização do spec-driven — mapeamento brownfield completo

---

## Current Focus

Projeto em produção. Documentação spec-driven criada a partir de análise do codebase existente.

## Active Work

Nenhum. Aguardando próxima feature ou bug a especificar.

## Recent Decisions

- **2026-03-28:** Criado .specs completo via brownfield mapping do codebase existente
  - 6 docs codebase (STACK, ARCHITECTURE, CONVENTIONS, STRUCTURE, TESTING, INTEGRATIONS)
  - PROJECT.md e ROADMAP.md baseados em `docs/formulario-credfacil-design.md` + análise do código
  - STATE.md inicializado

## Blockers

Nenhum.

## Preferences

- Documentação em português (idioma do domínio)
- Tarefas de atualização de estado (STATE.md, session handoff) funcionam bem com modelos mais rápidos/baratos

## Notes

- O arquivo `docs/formulario-credfacil-design.md` na raiz do projeto pai (`PROMPT-CREDFACIL/`) serve como design document de referência
- A lista `IGNORED_INBOX_IDS` em `lib/whatsapp-rotation.ts` está hardcoded — possível tech debt
- Não há testes automatizados — toda validação é manual ou via produção
- O `status` gravado no MongoDB é `'ETAPA_4'` (não `'ETAPA_5'` como descrito no design doc original) — o n8n deve estar mapeado para isso
