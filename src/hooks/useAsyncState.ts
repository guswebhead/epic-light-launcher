import { useCallback, useState } from "react";

/**
 * Hook para gerenciar estado de loading, erro e dados de forma genérica.
 *
 * @returns Estado e funções para controlar loading, erro e dados
 */
export function useAsyncState<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setSuccess = useCallback((newData: T) => {
    setData(newData);
    setError(null);
    setLoading(false);
  }, []);

  const setFailure = useCallback((message: string) => {
    setError(message);
    setData(null);
    setLoading(false);
  }, []);

  const setLoading_ = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    setSuccess,
    setFailure,
    setLoading: setLoading_,
    reset,
  };
}
