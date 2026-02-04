// import { useEffect, useState } from "react";
// import { fetchHighlights } from "../../api/storeService";
// import { GameCard } from "../../components/GameCard";

export function Highlights() {
//   const [ ] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchHighlights()
//       .then()
//       .finally(() => setLoading(false));
//   }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">⭐ Destaques (Jogos Grátis)</h1>

      {/* {loading && <p>Carregando...</p>} */}

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
    </div>
  );
}
