import { useState, useRef, useCallback } from 'react';

// Trava síncrona (useRef) + re-render (useState): o ref evita re-cliques no mesmo tick,
// o state aplica o disabled no próximo render.
export function useAcaoUnica(cooldownMs = 300) {
  const [executando, setExecutando] = useState(false);
  const lock = useRef(false);

  const executar = useCallback(
    async (fn: () => void | Promise<void>) => {
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
    },
    [cooldownMs],
  );

  return { executando, executar };
}
