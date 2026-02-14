import { useEffect, useState } from "react";
import { fetchHighlights } from "../../api/storeService";
import { StoreGameCard } from "../../components/StoreGameCard";

export function Highlights() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchHighlights()
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
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Destaques (Jogos gratis)</h1>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-800 animate-pulse rounded" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum destaque no momento.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {games.map((game, index) => (
            <StoreGameCard key={game.id ?? index} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
