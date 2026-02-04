import { useEffect, useRef, useState } from "react";
import {
  getEpicLibraryPaginated,
  searchEpicLibraryPaginated,
  reauthLegendary,
} from "../api/legendaryApiService";
import { GameCard } from "../components/GameCard";
import { GameCardSkeleton } from "../components/GameCardSkeleton";

export function Library() {
  const [games, setGames] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGames, setTotalGames] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const pageSize = 36; // tamanho de página do backend
  const inFlightRef = useRef<Map<string, Promise<any>>>(new Map());
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const requestKey = `${debouncedSearch}:${currentPage}:${pageSize}`;
    const requestId = ++requestIdRef.current;
    const isSearching = debouncedSearch.length > 0;

    let requestPromise = inFlightRef.current.get(requestKey);
    if (!requestPromise) {
      const fetcher = isSearching
        ? searchEpicLibraryPaginated(debouncedSearch, currentPage, pageSize)
        : getEpicLibraryPaginated(currentPage, pageSize);
      requestPromise = fetcher.finally(() => {
        inFlightRef.current.delete(requestKey);
      });
      inFlightRef.current.set(requestKey, requestPromise);
    }

    setLoading(true);
    setErrorMessage(null);

    requestPromise
      .then((libraryResponse) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setGames(libraryResponse.items);
        const nextTotalPages = Math.max(1, libraryResponse.total_pages || 1);
        setTotalPages(nextTotalPages);
        setTotalGames(libraryResponse.total);
        setNeedsAuth(false);
        if (currentPage > nextTotalPages) {
          setCurrentPage(nextTotalPages);
        }
      })
      .catch((error) => {
        console.error("Erro ao carregar biblioteca:", error);
        if (error instanceof Error) {
          console.error("Detalhes do erro:", error.message);
        }
        const rawMessage = String(error ?? "");
        if (rawMessage.includes("403 Client Error")) {
          setErrorMessage(
            "A Epic retornou 403 (Forbidden). Sua sessao pode ter expirado. Reautentique o Legendary e tente novamente."
          );
          setNeedsAuth(true);
        } else {
          setErrorMessage("Falha ao carregar a biblioteca. Tente novamente.");
          setNeedsAuth(false);
        }
        setGames([]);
        setTotalPages(1);
        setTotalGames(0);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [currentPage, pageSize, refreshTick, debouncedSearch]);

  const handleReauth = async () => {
    try {
      setAuthLoading(true);
      await reauthLegendary();
      setErrorMessage(null);
      setNeedsAuth(false);
      setRefreshTick((value) => value + 1);
    } catch (error) {
      console.error("Erro ao reautenticar:", error);
      setErrorMessage(
        "Falha ao reautenticar. Verifique o login do Legendary e tente novamente."
      );
      setNeedsAuth(true);
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Biblioteca</h1>

      <div className="mb-3 flex max-w-md items-center gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar jogo..."
          className="w-full flex-1 rounded bg-gray-800/70 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-600"
          >
            Limpar
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <span>{errorMessage}</span>
          {needsAuth && (
            <button
              onClick={handleReauth}
              disabled={authLoading}
              className="rounded bg-red-500/20 px-3 py-1 text-sm font-medium text-red-100 hover:bg-red-500/30 disabled:opacity-60"
            >
              {authLoading ? "Reautenticando..." : "Reautenticar"}
            </button>
          )}
        </div>
      )}

      <p className="text-sm text-gray-400 mb-2">Total de jogos: {totalGames}</p>

      {/* Card game */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {loading && [...Array(24)].map((_, i) => <GameCardSkeleton key={i} />)}

        {!loading &&
          games.map((game) => <GameCard key={game.app_name} game={game} />)}
      </div>

      {/* Paginação */}
      <div className="flex justify-center items-center gap-4 mt-6">
        <button
          disabled={currentPage === 1}
          onClick={handlePreviousPage}
          className="bg-gray-700 px-3 py-1 rounded disabled:opacity-40 hover:bg-gray-600 disabled:hover:bg-gray-700 transition"
        >
          Anterior
        </button>

        <span className="text-sm">
          Página {currentPage} de {totalPages}
        </span>

        <button
          disabled={currentPage >= totalPages}
          onClick={handleNextPage}
          className="bg-gray-700 px-3 py-1 rounded disabled:opacity-40 hover:bg-gray-600 disabled:hover:bg-gray-700 transition"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
