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

  const handleNavigate = useCallback(() => {
    navigate(`/game/${game.app_name}`, { state: { game } });
  }, [game, navigate]);

  return (
    <div
      onClick={handleNavigate}
      className="relative cursor-pointer group rounded overflow-hidden bg-gray-800 hover:shadow-xl transition"
    >
      <img
        src={image}
        alt={game.app_title}
        loading="lazy"
        className="w-full h-64 object-cover group-hover:scale-105 transition"
      />

      <div className="absolute bottom-0 w-full bg-gradient-to-t from-black p-2">
        <h3 className="text-sm font-semibold truncate">{game.app_title}</h3>
      </div>
    </div>
  );
}

export const GameCard = memo(GameCardComponent);
