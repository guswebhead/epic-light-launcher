import { useEffect, useMemo, useState } from "react";
import {
  getEpicLibrary,
  getInstalledEpicGames,
} from "../api/legendaryApiService";
import { GameCard } from "../components/GameCard";
import { GameCardSkeleton } from "../components/GameCardSkeleton";

export function Library() {
  const [games, setGames] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [totalGames, setTotalGames] = useState(0);

  const pageSize = 24; // quantidade por página
  const chunkSize = 200;

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    async function loadLibrary() {
      setLoading(true);
      setProcessing(true);

      const [library, installed] = await Promise.all([
        getEpicLibrary(),
        getInstalledEpicGames(),
      ]);

      if (cancelled) {
        return;
      }

      setTotalGames(library.length);
      setPage(0);
      setGames([]);

      const installedSet = new Set(installed.map((g: any) => g.app_name));
      let index = 0;

      const processChunk = () => {
        if (cancelled) {
          return;
        }

        const slice = library.slice(index, index + chunkSize).map((game: any) => ({
          ...game,
          installed: installedSet.has(game.app_name),
        }));

        setGames((prev) => [...prev, ...slice]);

        index += chunkSize;

        if (index >= chunkSize) {
          setLoading(false);
        }

        if (index < library.length) {
          timeoutId = window.setTimeout(processChunk, 0);
        } else {
          setProcessing(false);
          setLoading(false);
        }
      };

      if (library.length === 0) {
        setProcessing(false);
        setLoading(false);
        return;
      }

      processChunk();
    }

    loadLibrary();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const totalPages = useMemo(() => {
    if (totalGames === 0) {
      return 1;
    }

    return Math.ceil(totalGames / pageSize);
  }, [totalGames, pageSize]);

  const paginatedGames = useMemo(() => {
    return games.slice(page * pageSize, page * pageSize + pageSize);
  }, [games, page, pageSize]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Página inicial</h1>

      <p className="text-sm text-gray-400 mb-2">
        Total de jogos: {totalGames || games.length}
      </p>

      {processing && (
        <p className="text-xs text-gray-500 mb-4">
          Carregando mais jogos...
        </p>
      )}

      {/* card game */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {loading && [...Array(24)].map((_, i) => <GameCardSkeleton key={i} />)}

        {!loading &&
          paginatedGames.map((game) => (
            <GameCard key={game.app_name} game={game} />
          ))}
      </div>

      {/* Paginação */}
      <div className="flex justify-center items-center gap-4 mt-6">
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
          className="bg-gray-700 px-3 py-1 rounded disabled:opacity-40"
        >
          ⬅ Anterior
        </button>

        <span className="text-sm">
          Página {page + 1} de {totalPages}
        </span>

        <button
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="bg-gray-700 px-3 py-1 rounded disabled:opacity-40"
        >
          Próxima ➡
        </button>
      </div>
    </div>
  );
}
