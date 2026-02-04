import { useLocation, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getEpicGameDetails } from "../api/legendaryApiService";
import { getGameImage } from "../utils/getGameImage";

export function GameDetails() {
  const { appName } = useParams();
  const location = useLocation();
  const stateGame = (location.state as { game?: any } | null)?.game;
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGame() {
      setLoading(true);
      setErrorMessage(null);

      if (stateGame && stateGame.app_name === appName) {
        console.log(stateGame)
        setGame(stateGame);
        setLoading(false);
        return;
      }

      if (!appName) {
        setGame(null);
        setErrorMessage("Jogo nao encontrado.");
        setLoading(false);
        return;
      }

      try {
        const selected = await getEpicGameDetails(appName);
        if (!cancelled) {
          setGame(selected);
        }
      } catch (error) {
        console.error("Erro ao carregar detalhes do jogo:", error);
        if (!cancelled) {
          setErrorMessage("Falha ao carregar detalhes do jogo.");
          setGame(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGame();

    return () => {
      cancelled = true;
    };
  }, [appName, stateGame]);

  const title =
    game?.app_title ??
    game?.title ??
    game?.metadata?.title ??
    game?.metadata?.name ??
    appName ??
    "Jogo";

  const description =
    game?.metadata?.description ??
    game?.metadata?.shortDescription ??
    game?.metadata?.longDescription ??
    game?.description ??
    "";

  const infoItems = useMemo(() => {
    const categories = game?.metadata?.categories ?? game?.categories;
    const categoryLabel = Array.isArray(categories)
      ? categories
          .map((cat: any) => cat?.path ?? cat?.name ?? cat)
          .filter(Boolean)
          .join(", ")
      : categories;

    return [
      { label: "App Name", value: game?.app_name },
      { label: "Namespace", value: game?.namespace },
      { label: "Desenvolvedor", value: game?.metadata?.developer ?? game?.developer },
      { label: "Publisher", value: game?.metadata?.publisher ?? game?.publisher },
      { label: "Categoria", value: categoryLabel },
      { label: "Release", value: game?.metadata?.releaseDate ?? game?.releaseDate },
    ].filter((item) => Boolean(item.value));
  }, [game]);

  if (loading) return <p>Carregando...</p>;
  if (errorMessage) return <p className="text-red-200">{errorMessage}</p>;
  if (!game) return <p>Jogo nao encontrado.</p>;

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <img
          src={getGameImage(game)}
          alt={title}
          className="w-full rounded shadow-lg"
        />

        <div className="rounded bg-gray-800/60 p-3 text-sm text-gray-300">
          {infoItems.map((item) => (
            <div key={item.label} className="flex justify-between gap-2">
              <span className="text-gray-400">{item.label}</span>
              <span className="text-right text-gray-100">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {game?.app_name && (
            <p className="text-sm text-gray-400">AppName: {game.app_name}</p>
          )}
        </div>

        {description && (
          <p className="text-gray-300 leading-relaxed">{description}</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            className="bg-green-600 px-4 py-2 rounded opacity-60 cursor-not-allowed"
            disabled
          >
            Jogar
          </button>
          <button
            className="bg-blue-600 px-4 py-2 rounded opacity-60 cursor-not-allowed"
            disabled
          >
            Abrir na Epic
          </button>
        </div>
      </div>
    </div>
  );
}
