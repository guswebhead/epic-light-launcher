import { useEffect, useState } from "react";
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

  const pageSize = 24; // quantidade por página

  useEffect(() => {
    async function loadLibrary() {
      setLoading(true);

      const [library, installed] = await Promise.all([
        getEpicLibrary(),
        getInstalledEpicGames(),
      ]);

      const installedSet = new Set(installed.map((g: any) => g.app_name));

      const merged = library.map((game: any) => ({
        ...game,
        installed: installedSet.has(game.app_name),
      }));

      setGames(merged);
      setLoading(false);
    }

    loadLibrary();
  }, []);

  const totalPages = Math.ceil(games.length / pageSize);

  const paginatedGames = games.slice(
    page * pageSize,
    page * pageSize + pageSize,
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Página inicial</h1>

      <p className="text-sm text-gray-400 mb-4">
        Total de jogos: {games.length}
      </p>

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
