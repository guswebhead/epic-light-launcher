import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getEpicLibrary } from "../api/legendaryApiService";

export function GameDetails() {
  const { appName } = useParams();
  const [game, setGame] = useState<any>(null);

  useEffect(() => {
    async function loadGame() {
      const games = await getEpicLibrary();
      const selected = games.find((g: any) => g.app_name === appName);
      setGame(selected);
    }

    loadGame();
  }, [appName]);

  if (!game) return <p>Carregando...</p>;

  return (
    <div className="flex gap-6">
      {/* Capa */}
      <img
        src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.app_name}/library_600x900.jpg`}
        alt={game.title}
        className="w-64 rounded shadow-lg"
      />

      {/* Infos */}
      <div>
        <h1 className="text-3xl font-bold mb-2">{game.title}</h1>

        <p className="text-gray-400 mb-4">
          AppName: {game.app_name}
        </p>

        <div className="flex gap-4">
          <button className="bg-green-600 px-4 py-2 rounded">
            ▶ Jogar
          </button>

          <button className="bg-blue-600 px-4 py-2 rounded">
            Abrir na Epic
          </button>
        </div>
      </div>
    </div>
  );
}
