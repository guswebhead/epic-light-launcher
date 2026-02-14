import { useEffect, useState } from "react";

/**
 * Hook que retorna um valor debounced.
 * Útil para search, validação de formulário, etc.
 *
 * @param value - Valor a debounce
 * @param delay - Delay em ms (padrão: 300ms)
 * @returns Valor debounced
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
