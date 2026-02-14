import { getFavoriteGames, removeFavoriteGame } from "../../api/favoriteGamesService";

export function Wishlist() {
  const favorites = getFavoriteGames();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">💖 Lista de Desejos</h1>

      {favorites.length === 0 && <p>Nenhum jogo na lista.</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {favorites.map((game, index) => (
          <div key={index} className="bg-gray-800 p-3 rounded">
            <h3>{game.title}</h3>

            <button
              onClick={() =>
                window.open(`com.epicgames.launcher://store/p/${game.slug}`)
              }
              className="mt-2 w-full bg-blue-600 p-1 rounded"
            >
              Abrir na Epic
            </button>

            <button
              onClick={() => removeFavoriteGame(game.slug)}
              className="mt-2 w-full bg-red-600 p-1 rounded"
            >
              ❌ Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
