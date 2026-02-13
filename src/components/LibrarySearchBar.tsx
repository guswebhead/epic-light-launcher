import type { ChangeEvent } from "react";

interface LibrarySearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

/**
 * Barra de busca para filtrar jogos na biblioteca
 */
export function LibrarySearchBar({
  searchTerm,
  onSearchChange,
}: LibrarySearchBarProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const handleClear = () => {
    onSearchChange("");
  };

  return (
    <div className="mb-3 flex max-w-md items-center gap-2">
      <input
        type="text"
        value={searchTerm}
        onChange={handleChange}
        placeholder="Buscar jogo..."
        className="w-full flex-1 rounded bg-gray-800/70 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
      />
      {searchTerm && (
        <button
          onClick={handleClear}
          className="rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-600"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
