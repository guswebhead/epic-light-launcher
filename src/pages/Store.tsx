import { useEffect, useState } from "react";
import { fetchHighlights, fetchPromotions } from "../api/storeService";
import { StoreGameCard } from "../components/StoreGameCard";
import type { StoreGame } from "../types/EpicGame";

export function Store() {
  const [freeGames, setFreeGames] = useState<StoreGame[]>([]);
  const [promotions, setPromotions] = useState<StoreGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([
      fetchHighlights(),
      fetchPromotions("BR", "pt-BR", 12),
    ])
      .then(([freeResult, promoResult]) => {
        if (!active) {
          return;
        }
        if (freeResult.status === "fulfilled") {
          setFreeGames(freeResult.value);
        } else {
          console.error(freeResult.reason);
        }
        if (promoResult.status === "fulfilled") {
          setPromotions(promoResult.value);
        } else {
          console.error(promoResult.reason);
        }
      })
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
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Loja Epic</h1>
        <p className="text-sm text-gray-400">
          Destaques, jogos gratis e promocoes em tempo real.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Jogos gratis da semana</h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-800 animate-pulse rounded" />
            ))}
          </div>
        ) : freeGames.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum jogo gratis no momento.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {freeGames.slice(0, 8).map((game, index) => (
              <StoreGameCard key={game.id ?? index} game={game} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Promocoes em destaque</h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-800 animate-pulse rounded" />
            ))}
          </div>
        ) : promotions.length === 0 ? (
          <p className="text-sm text-gray-400">
            Nenhuma promocao encontrada agora.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {promotions.map((game, index) => (
              <StoreGameCard key={game.id ?? index} game={game} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
