import { useEffect, useState } from "react";
import { fetchAllGames } from "../../api/storeSearchService";
import { StoreGameCard } from "../../components/StoreGameCard";

export function AllGames() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAllGames(page * 40, 40)
      .then((data) => {
        if (active) {
          setGames(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [page]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Todos os Jogos</h1>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-800 animate-pulse rounded" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum jogo encontrado.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {games.map((game, index) => (
            <StoreGameCard key={game.id ?? index} game={game} />
          ))}
        </div>
      )}

      <div className="flex gap-4 mt-6">
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 0))}
          className="bg-gray-700 px-4 py-2 rounded"
        >
          Anterior
        </button>

        <button
          onClick={() => setPage((p) => p + 1)}
          className="bg-gray-700 px-4 py-2 rounded"
        >
          Proxima
        </button>
      </div>
    </div>
  );
}
