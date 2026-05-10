# State

**Last updated:** 2026-05-10
**Session:** Portal do Cliente implementado — reenvio individual de documentos rejeitados, redirect inteligente e correção de erro 500

---

## Current Focus

Feature "Portal do Cliente" — implementada e commitada na branch `feature/validacao-documentos-ia` (commit `afeabc8`). Pronto para testes no celular via Vercel Preview.

Feature "Login do Cliente Existente" — spec aprovada. Redirect inteligente pós-login **implementado** como parte do portal: login agora usa `temDocumentos` flag para decidir entre `/status` e `/documentos`.

## Active Work

- Branch `feature/validacao-documentos-ia`: 9 commits, TypeScript ✅ sem erros
- Aguardando testes manuais E2E no celular via Vercel Preview (T33)
- Próximo passo: merge para master após validação

## Recent Decisions

- **2026-05-10:** Portal do Cliente implementado (T34/T35)
  - `/status` reescrita como portal com saudação personalizada, barra de progresso e cards de documentos
  - `GET /api/candidato` — nova API que retorna nome, CPF mascarado, statusDocumentos e status por documento
  - `components/portal/card-documento.tsx` — card visual com badge de status, motivo, animação pulse
  - `components/portal/reenvio-documento.tsx` — reenvio individual reutilizando componentes de captura existentes
  - `components/portal/secao-contato.tsx` — seção WhatsApp quando todos aprovados
  - `/documentos` protegida: redireciona para portal se já tem documentos enviados
  - Login: flag `temDocumentos` retornada, frontend redireciona para `/status` quando true
- **2026-05-09:** Correção do erro 500 na rota `/api/validacao/iniciar` na Vercel
  - `pdf-to-img` convertido para import dinâmico em `rekognition.ts`
  - `sharp` convertido para import dinâmico em `gemini.ts`
  - Handler POST envolvido em try-catch com resposta JSON estruturada
- **2026-03-29:** Gap identificado no fluxo "Já sou cliente" — candidatos com conta eram redirecionados para WhatsApp em vez de /login. Solução implementada no portal: login retorna `temDocumentos`, frontend redireciona conforme.
- **2026-03-29:** Implementação completa da feature em 6 fases (T1-T32)
- **2026-03-28:** Feature "Validação de Documentos com IA" desenhada e aprovada

## Blockers

~~- Conta Google Cloud (Gemini API) precisa ser criada — necessária para testes reais~~
~~- Conta AWS (Rekognition) precisa ser criada — necessária para testes reais~~
~~- Bucket Cloudflare R2 precisa ser criado — necessário para testes de upload~~
~~- Domínio para o formulário na VPS precisa ser configurado — necessário para deploy~~

- Testes manuais E2E (T33) pendentes no celular real — simulação no Chrome não abre câmera nativamente
- Build local falha por bug pré-existente do Next.js 16 + Turbopack + `output: 'standalone'` (não impacta Vercel)

## Preferences

- Documentação em português (idioma do domínio)
- Tarefas de atualização de estado (STATE.md, session handoff) funcionam bem com modelos mais rápidos/baratos

## Notes

- A lista `IGNORED_INBOX_IDS` em `lib/whatsapp-rotation.ts` está hardcoded — possível tech debt
- Não há testes automatizados — toda validação é manual ou via produção
- O `status` gravado no MongoDB é `'ETAPA_4'` (não `'ETAPA_5'`) — o n8n deve estar mapeado para isso
- `statusDocumentos: 'AGUARDANDO_DOCUMENTOS'` é o valor que indica primeiro acesso ao `/documentos`
- Portal do cliente não altera nenhuma API existente — zero risco de regressão no fluxo original
