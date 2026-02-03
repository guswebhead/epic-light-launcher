import { useEffect, useState } from "react";
import { fetchFreeGames } from "../api/epicStoreService";
import { GameCard } from "../components/GameCard";

export function Store() {
  const [games, setGames] = useState<any[]>([]);

  useEffect(() => {
    fetchFreeGames().then(setGames);
  }, []);

  return (
    <div>
      <h1>Epic Light Store</h1>
      <div className="grid">
        {games.map((game) => (
          <GameCard
            key={game.id}
            title={game.title}
            image={game.keyImages[0]?.url}
          />
        ))}
      </div>
    </div>
  );
}
