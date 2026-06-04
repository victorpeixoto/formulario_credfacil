# Análise trava +30 min no iPhone — Design técnico

**Data:** 2026-06-04
**Spec:** [spec.md](./spec.md)
**ClickUp:** [86ahf46z7](https://app.clickup.com/t/86ahf46z7)

---

## Abordagem: defense-in-depth

Três camadas independentes; **cada uma sozinha já quebra a trava infinita**. Nenhuma toca na lógica de cruzamento/decisão.

### Camada 1 — Timeout por tarefa (raiz)

**Arquivo:** `lib/ai/pipeline/executar-validacoes.ts`
**Config:** `lib/ai/pipeline/config.ts` → `export const TIMEOUT_VALIDACAO_MS = 120_000;`

Envolver cada `fn()` em um `Promise.race` com um timer que rejeita:

```ts
function comTimeout<T>(fn: () => Promise<T>, ms: number, tipo: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(
      () => reject(new Error(`Timeout de ${ms}ms na validação ${tipo}`)),
      ms,
    );
    fn().then(
      (v) => { clearTimeout(id); resolve(v); },
      (e) => { clearTimeout(id); reject(e); },
    );
  });
}
```

- Aplicar dentro de `executarComRetry` (cada tentativa tem seu próprio timeout) **ou** envolvendo a tarefa inteira. Proposta: por tentativa, para que o retry de rate-limit também respeite o teto.
- Timeout → rejeição → cai no caminho `rejected`/`ErroTarefa` já existente → documento vira `erro` → `PENDENCIA`.
- **Importante:** o timeout só rejeita a Promise; a chamada subjacente ao Gemini/Rekognition pode continuar em background até o runtime encerrar. Aceitável (resultado tardio é ignorado). Idealmente combinar com `AbortSignal` nos `fetch` (ver "Reforço opcional").

**Reforço opcional (não obrigatório nesta entrega):** passar `signal: AbortSignal.timeout(TIMEOUT_VALIDACAO_MS)` nos `fetch()` de `gemini.ts`/`rekognition.ts` para abortar o download de fato. Mantido fora do MVP para minimizar superfície.

### Camada 2 — Status terminal em falha do orquestrador

**Arquivo:** `app/api/validacao/iniciar/route.ts` (~linha 228)

Hoje:
```ts
executarPipeline(...).catch((err) => {
  console.error('[validacao/iniciar] Erro no pipeline:', err);
});
```

Proposta: no `.catch()`, além do log, gravar status terminal para o `formCode`:
```ts
.catch(async (err) => {
  console.error('[validacao/iniciar] Erro no pipeline:', err);
  try {
    const client = await clientPromise;
    await client.db('credfacil').collection('conversations').updateOne(
      { formCode: payload.formCode },
      { $set: { statusDocumentos: 'PENDENCIA' } },
    );
  } catch (e2) {
    console.error('[validacao/iniciar] Falha ao gravar status terminal:', e2);
  }
});
```

- Garante que uma exceção do pipeline nunca deixe `PROCESSANDO`.
- `PENDENCIA` permite ao cliente reenviar (caminho seguro). Confirmar na decisão em aberto.

### Camada 3 — Frontend: feedback + limite de reconexão

**Arquivo:** `app/(auth)/status/page.tsx`

1. Adicionar listener do evento `erro` do SSE (hoje inexistente):
   ```ts
   es.addEventListener('erro', (e) => {
     const { mensagem } = JSON.parse(e.data);
     es.close();
     setErroAnalise(mensagem ?? 'A análise demorou mais que o esperado. Recarregue a página.');
   });
   ```
2. Limitar `es.onerror`: contar tentativas (`reconexõesRef`) e, ao exceder o teto (ex.: 5) ou após tempo total, parar e exibir a mensagem de demora em vez de reconectar para sempre.
3. Novo estado `erroAnalise` renderiza um aviso com botão "Recarregar".

---

## Por que não mexer no fire-and-forget agora

O disparo sem `await` (`route.ts`) é um risco real em serverless (função pode congelar após o `return`). Corrigir de verdade exige fila/worker (`waitUntil`, QStash, etc.) — mudança de arquitetura fora do escopo de um hotfix. As camadas 1–3 resolvem o **sintoma do usuário** independentemente do hosting. Registrado como decisão em aberto/futuro.

## Teste (Camada 1)

`lib/ai/pipeline/__tests__/executar-validacoes.timeout.test.ts` (`node --test`):

- Tarefa cujo `fn()` retorna uma Promise que nunca resolve → `executarValidacoes` resolve com `ErroTarefa` para aquele tipo **dentro do timeout** (usar timeout curto injetável ou fake timers).
- Tarefa normal continua retornando resultado (sem regressão).
- Recomendação: tornar o timeout **parametrizável** (parâmetro opcional com default `TIMEOUT_VALIDACAO_MS`) para o teste rodar rápido sem esperar 120s.

## Impacto / Risco

- **Baixo no caminho de aprovação:** timeout só atua quando algo já estava travado; tarefas normais (<60s) não são afetadas.
- **Reversível:** cada camada é isolada e pode ser revertida sem tocar nas demais.
- **Compatibilidade:** nenhum novo pacote; usa `setTimeout`/`Promise.race`/`AbortSignal` nativos.
