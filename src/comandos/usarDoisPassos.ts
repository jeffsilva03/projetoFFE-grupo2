import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 6.6: confirmação em dois passos. O primeiro clique arma; o segundo, dentro do prazo, executa.
 * Sem o segundo clique, volta ao normal. O temporizador é cancelado ao desmontar (sem envio fantasma).
 */
export function usarDoisPassos(prazoMs: number, executar: () => void) {
  const [armado, definirArmado] = useState(false);
  const timer = useRef<number | null>(null);
  const executarRef = useRef(executar);
  executarRef.current = executar;

  const desarmar = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    definirArmado(false);
  }, []);

  const clicar = useCallback(() => {
    if (timer.current === null) {
      definirArmado(true);
      timer.current = window.setTimeout(() => { timer.current = null; definirArmado(false); }, prazoMs);
      return;
    }
    desarmar();
    executarRef.current();
  }, [prazoMs, desarmar]);

  useEffect(() => desarmar, [desarmar]);
  return { armado, clicar, desarmar };
}
