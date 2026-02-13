import { useEffect, useRef, useState } from "react";
import {
  getEpicLibraryPaginated,
  searchEpicLibraryPaginated,
  reauthLegendary,
} from "../api/legendaryApiService";
import { GameCard } from "../components/GameCard";
import { GameCardSkeleton } from "../components/GameCardSkeleton";
import { LibrarySearchBar } from "../components/LibrarySearchBar";
import { LibraryPagination } from "../components/LibraryPagination";
import { LibraryErrorAlert } from "../components/LibraryErrorAlert";
import { useDebounce } from "../hooks/useDebounce";
import type { EpicGame, PaginatedData } from "../types/EpicGame";

const PAGE_SIZE = 36;

export function Library() {
  const [games, setGames] = useState<EpicGame[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGames, setTotalGames] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const inFlightRef = useRef<Map<string, Promise<PaginatedData<EpicGame>>>>(
    new Map()
  );
  const requestIdRef = useRef(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const trimmedSearch = debouncedSearch.trim();
    const requestKey = `${trimmedSearch}:${currentPage}:${PAGE_SIZE}`;
    const requestId = ++requestIdRef.current;
    const isSearching = trimmedSearch.length > 0;

    let requestPromise = inFlightRef.current.get(requestKey);
    if (!requestPromise) {
      const fetcher = isSearching
        ? searchEpicLibraryPaginated(trimmedSearch, currentPage, PAGE_SIZE)
        : getEpicLibraryPaginated(currentPage, PAGE_SIZE);
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
  }, [currentPage, refreshTick, debouncedSearch]);

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

      <LibrarySearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {errorMessage && (
        <LibraryErrorAlert
          errorMessage={errorMessage}
          needsAuth={needsAuth}
          authLoading={authLoading}
          onReauth={handleReauth}
        />
      )}

      <p className="text-sm text-gray-400 mb-2">Total de jogos: {totalGames}</p>

      {/* Card game */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {loading && [...Array(24)].map((_, i) => <GameCardSkeleton key={i} />)}

        {!loading &&
          games.map((game) => <GameCard key={game.app_name} game={game} />)}
      </div>

      {/* Paginação */}
      <LibraryPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
      />
    </div>
  );
}

