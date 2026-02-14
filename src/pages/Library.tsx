import { useEffect, useRef, useState, useMemo } from "react";
import {
  getEpicLibraryVirtual,
  reauthLegendary,
} from "../api/legendaryApiService";
import { GameCard } from "../components/GameCard";
import { GameCardSkeleton } from "../components/GameCardSkeleton";
import { LibrarySearchBar } from "../components/LibrarySearchBar";
import { LibraryErrorAlert } from "../components/LibraryErrorAlert";
import { useDebounce } from "../hooks/useDebounce";
import { useVirtualGrid } from "../hooks/useVirtualGrid";
import type { EpicGame } from "../types/EpicGame";

// Virtual scroll configuration
const ITEM_HEIGHT = 260; // GameCard height + gap
const COLUMNS_PER_ROW = 5; // lg:grid-cols-5
const GAP = 16;

export function Library() {
  const [allGames, setAllGames] = useState<EpicGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalGames, setTotalGames] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter games based on search term
  const filteredGames = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return allGames;
    }
    const query = debouncedSearch.toLowerCase();
    return allGames.filter(
      (game) =>
        game.app_title?.toLowerCase().includes(query) ||
        game.app_name?.toLowerCase().includes(query)
    );
  }, [allGames, debouncedSearch]);

  // Initialize virtual grid
  const {
    parentRef,
    visibleItems,
    paddingTop,
    paddingBottom,
  } = useVirtualGrid({
    items: filteredGames,
    columnsPerRow: COLUMNS_PER_ROW,
    itemHeight: ITEM_HEIGHT,
    gap: GAP,
    overscan: 10,
  });

  // Load all games on mount
  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage(null);

    getEpicLibraryVirtual()
      .then((games) => {
        if (!active) return;
        setAllGames(games);
        setTotalGames(games.length);
        setNeedsAuth(false);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Erro ao carregar biblioteca:", error);
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
        setAllGames([]);
        setTotalGames(0);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [refreshTick]);

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

      <p className="text-sm text-gray-400 mb-4">
        Exibindo {filteredGames.length} de {totalGames} jogos
      </p>

      {/* Virtual scrolling grid container */}
      <div
        ref={containerRef}
        style={{ height: "70vh", overflow: "auto" }}
        className="border border-gray-800 rounded-lg bg-gray-900/50"
      >
        <div
          ref={parentRef}
          style={{ height: "100%", overflow: "auto" }}
          className="space-y-4"
        >
          {loading && !allGames.length ? (
            <div className="grid gap-4 p-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {[...Array(20)].map((_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Nenhum jogo encontrado
            </div>
          ) : (
            <div
              style={{ height: `${paddingTop}px` }}
              className="pointer-events-none"
            />
          )}

          {/* Render visible items in grid */}
          {visibleItems.length > 0 && (
            <div className="grid gap-4 p-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {visibleItems.map(({ item: game, index }) => (
                <GameCard key={`${game.app_name}-${index}`} game={game} />
              ))}
            </div>
          )}

          {/* Bottom padding for remaining items */}
          <div
            style={{ height: `${paddingBottom}px` }}
            className="pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}

