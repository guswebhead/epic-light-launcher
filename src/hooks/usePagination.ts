import { useCallback, useState } from "react";

/**
 * Hook para gerenciar estado de paginação.
 *
 * @param initialPage - Página inicial (padrão: 1)
 * @returns Estado e funções de paginação
 */
export function usePagination(initialPage: number = 1) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page));
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const updatePaginationInfo = useCallback(
    (total: number, pageSize: number) => {
      setTotalItems(total);
      const pages = pageSize > 0 ? Math.ceil(total / pageSize) : 1;
      setTotalPages(Math.max(1, pages));
    },
    []
  );

  return {
    currentPage,
    totalPages,
    totalItems,
    goToPage,
    nextPage,
    prevPage,
    resetToFirstPage,
    updatePaginationInfo,
  };
}
