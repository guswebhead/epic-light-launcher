import { useEffect, useState } from "react";
import { fetchHighlights } from "../api/storeService";
// import { GameCard } from "../components/GameCard";
import { fetchAllGames } from "../api/storeSearchService";

export function Store() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page] = useState(0);

  useEffect(() => {
    fetchAllGames(page * 40).then(setGames);
  }, [page]);

  useEffect(() => {
    fetchHighlights()
      .then((data) => {
        console.log("Jogos da Store:", data);
        setGames(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Store</h1>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-700 animate-pulse rounded" />
          ))}
        </div>
      )}

      {/* {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {games.map(() => (
            // <GameCard
            //   key={game.id}
            //   title={game.title}
            //   image={game.keyImages?.[0]?.url}
            // />
          ))}
        </div>
      )} */}
    </div>
  );
}
