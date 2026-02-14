import { useNavigate } from "react-router-dom";
import { memo, useCallback } from "react";
import { getGameImage } from "../utils/getGameImage";
import type { EpicGame } from "../types/EpicGame";

type Props = {
  game: EpicGame;
};

function GameCardComponent({ game }: Props) {
  const navigate = useNavigate();
  const image = getGameImage(game);
  const title = game.app_title?.trim() || game.metadata?.title || "Sem titulo";

  const handleNavigate = useCallback(() => {
    navigate(`/game/${game.app_name}`, { state: { game } });
  }, [game, navigate]);

  return (
    <div
      onClick={handleNavigate}
      className="group cursor-pointer overflow-hidden rounded-lg border border-gray-800 bg-gray-900 transition hover:border-gray-700 hover:shadow-xl"
    >
      <div className="relative h-40 bg-gradient-to-br from-gray-800 to-gray-950">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      </div>

      <div className="space-y-1 p-3">
        <h3 className="truncate text-sm font-semibold text-gray-100">{title}</h3>
        <p className="truncate text-xs text-gray-400">{game.app_name}</p>
      </div>
    </div>
  );
}

export const GameCard = memo(GameCardComponent);
