interface LibraryPaginationProps {
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

/**
 * Controles de paginação para a biblioteca
 */
export function LibraryPagination({
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
}: LibraryPaginationProps) {
  return (
    <div className="flex justify-center items-center gap-4 mt-6">
      <button
        disabled={currentPage === 1}
        onClick={onPreviousPage}
        className="bg-gray-700 px-3 py-1 rounded disabled:opacity-40 hover:bg-gray-600 disabled:hover:bg-gray-700 transition"
      >
        Anterior
      </button>

      <span className="text-sm">
        Página {currentPage} de {totalPages}
      </span>

      <button
        disabled={currentPage >= totalPages}
        onClick={onNextPage}
        className="bg-gray-700 px-3 py-1 rounded disabled:opacity-40 hover:bg-gray-600 disabled:hover:bg-gray-700 transition"
      >
        Próxima
      </button>
    </div>
  );
}
