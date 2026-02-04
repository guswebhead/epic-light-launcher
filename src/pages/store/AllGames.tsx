import { useEffect, useState } from "react";
import { fetchAllGames } from "../../api/storeSearchService";
// import { GameCard } from "../../components/GameCard";

export function AllGames() {
//   const [ ] = useState<any[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchAllGames(page * 40).then();
  }, [page]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">🎮 Todos os Jogos</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* {games.map(game => (
          <GameCard
            key={game.id}
            title={game.title}
            image={game.keyImages?.[0]?.url}
            slug={game.productSlug}
          />
        ))} */}
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={() => setPage(p => Math.max(p - 1, 0))}
          className="bg-gray-700 p-2 rounded"
        >
          ⬅ Anterior
        </button>

        <button
          onClick={() => setPage(p => p + 1)}
          className="bg-gray-700 p-2 rounded"
        >
          Próxima ➡
        </button>
      </div>
    </div>
  );
}
