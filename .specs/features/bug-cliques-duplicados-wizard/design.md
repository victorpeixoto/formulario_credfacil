# Bug — Cliques Duplicados no Wizard — Design

**Status**: 📋 Proposto — 2026-05-19
**Spec relacionada:** [spec.md](./spec.md)

---

## Estratégia geral

Aplicar duas camadas defensivas combinadas, em vez de escolher uma só:

1. **Camada A — UI desabilitada + feedback de loading:** todo botão que dispara ação ganha `disabled` enquanto a ação está em curso e troca para um estado visual de processamento. Isso resolve o problema percebido (usuário não sabe se o clique funcionou) e elimina a janela de re-clique para a maioria dos casos.
2. **Camada B — Idempotência via flag/functional updater:** mesmo se o usuário forçar (ex.: latência maior que a animação de disabled), o handler é guardado por uma flag local (`useRef`) ou usa `setState((prev) => ...)` com guarda de invariante (ex.: só avança se `prev === passoAtualEsperado`).

A camada A sozinha não basta porque o React renderiza com delay; entre o `onClick` disparar e o re-render desabilitar o botão, um segundo `onClick` pode entrar. A camada B sozinha também não basta porque o usuário continua sem feedback.

## Decisões técnicas

### 1. Hook utilitário `useAcaoUnica`

Criar `lib/hooks/use-acao-unica.ts` que retorna `{ executando, executar }`. O `executar` aceita uma função (síncrona ou async) e:
- Ignora chamadas se já está executando.
- Marca `executando=true` antes de chamar.
- Marca `executando=false` no `finally`.
- Para ações síncronas, opcionalmente mantém `executando=true` por um `cooldown` mínimo (default 300ms) para garantir o feedback visual.

```ts
function useAcaoUnica(cooldownMs = 300) {
  const [executando, setExecutando] = useState(false);
  const lock = useRef(false);

  const executar = useCallback(async (fn: () => void | Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setExecutando(true);
    const inicio = Date.now();
    try {
      await fn();
    } finally {
      const restante = cooldownMs - (Date.now() - inicio);
      if (restante > 0) await new Promise((r) => setTimeout(r, restante));
      lock.current = false;
      setExecutando(false);
    }
  }, [cooldownMs]);

  return { executando, executar };
}
```

Por quê `useRef` + `useState` combinados: o `useState` ainda é necessário para o re-render que aplica `disabled`; o `useRef` garante a trava síncrona dentro do mesmo tick (cliques realmente simultâneos).

### 2. Aplicação em `app/(auth)/documentos/page.tsx`

Cada botão de transição ganha sua própria instância do hook ou uma compartilhada quando faz sentido:

| Botão | Hook dedicado? | Cooldown |
|---|---|---|
| "Enviar documento" / "Abrir câmera" / "Continuar" (abre captura) | sim | 300ms |
| "Continuar" (avança passo) | sim | 300ms |
| "Refazer" (passo atual) | sim | 300ms |
| "Refazer" (resumo, por tipo) | um por linha — `useAcaoUnica` por chave de tipo, ou guard com `prev` | 300ms |
| "Enviar para análise" | sim | sem cooldown (espera o fetch) |
| "Voltar" no `passo-wizard.tsx` | implementado dentro do componente | 300ms |

Para o avanço de passo, usar **functional updater com guarda**:

```ts
setPasso((p) => p === passoCapturadoNoClick ? p + 1 : p);
```

Isso protege contra closures velhas em filas de cliques.

### 3. Estado visual

Convenção para os botões verdes principais:
- Estado normal: cor verde, texto original.
- Estado executando: mesma cor (não muda para cinza), `opacity-60`, `cursor-not-allowed`, troca o texto para a versão "...ando" e mostra spinner inline à esquerda do texto.

Componente auxiliar opcional: `<BotaoPrincipal executando={...} textoExecutando="Avançando...">Continuar</BotaoPrincipal>` em `components/ui/botao-principal.tsx`. Vale criar se 4+ botões usarem o mesmo padrão.

### 4. Trava no `passo-wizard.tsx`

O botão de voltar precisa do mesmo tratamento. Adicionar prop opcional `voltarOcupado?: boolean` controlada pelo pai não é necessário — usar o `useAcaoUnica` dentro do próprio componente quando `onVoltar` é definido.

## Alternativas consideradas

1. **Debounce simples (`lodash.debounce` 300ms):** rejeitado — atrasa o feedback do clique legítimo e não dá pista visual de loading.
2. **Throttle:** rejeitado pelo mesmo motivo + comportamento contraintuitivo (segundo clique disparar depois).
3. **Apenas `disabled` no botão:** insuficiente conforme explicado na estratégia.
4. **`useTransition` do React:** útil para marcar updates como não-urgentes, mas não resolve a corrida de cliques. Pode complementar mas não substitui.

## Riscos e mitigação

- **Cooldown longo demais:** se o cooldown for muito alto, o fluxo feliz fica perceptivelmente lento. 300ms é o limite onde o usuário ainda percebe como instantâneo.
- **Hook duplicado em mil lugares:** mitigado pelo `BotaoPrincipal` ou por instâncias locais nomeadas claramente.
- **Regressão em testes manuais:** validar o fluxo feliz cronometrado em <2s do início ao avanço.

## Arquivos afetados

- `formulario-credfacil/lib/hooks/use-acao-unica.ts` (novo).
- `formulario-credfacil/components/ui/botao-principal.tsx` (novo, opcional).
- `formulario-credfacil/app/(auth)/documentos/page.tsx` (modificado — aplicação dos hooks).
- `formulario-credfacil/components/captura/passo-wizard.tsx` (modificado — trava do voltar).
