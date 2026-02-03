import { useEffect, useState } from "react";
import { fetchFreeGames } from "../api/epicStoreService";
import { GameCard } from "../components/GameCard";

type EpicGame = {
  id: string;
  title: string;
  keyImages: { url: string }[];
  productSlug: string;
};

export function Store() {
  const [games, setGames] = useState<EpicGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchFreeGames().then((data) => {
      setGames(data);
      setLoading(false);
    });
  }, []);

  const filteredGames = games.filter((game) =>
    game.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Store</h1>

      <div className="max-w-7xl mx-auto">
        <div className="min-h-screen bg-gray-900 text-white p-6">
          <h1 className="text-3xl font-bold mb-4">Epic Light Launcher</h1>

          <input
            type="text"
            placeholder="Buscar jogo..."
            className="w-full p-2 mb-4 rounded bg-gray-800"
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 bg-gray-700 animate-pulse rounded"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  title={game.title}
                  image={game.keyImages[0]?.url}
                  slug={game.productSlug}
                />
              ))}

              {filteredGames.length === 0 && !loading && (
                <p className="text-gray-400">Nenhum jogo encontrado.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
