import { useNavigate } from "react-router-dom";
import { getGameImage } from "../utils/getGameImage";

type Props = {
  game: any;
};

export function GameCard({ game }: Props) {
  const navigate = useNavigate();
  const image = getGameImage(game);

  return (
    <div
      onClick={() => navigate(`/game/${game.app_name}`)}
      className="relative cursor-pointer group rounded overflow-hidden bg-gray-800 hover:shadow-xl transition"
    >
      <img
        src={image}
        alt={game.app_title}
        className="w-full h-64 object-cover group-hover:scale-105 transition"
      />

      <div className="absolute bottom-0 w-full bg-gradient-to-t from-black p-2">
        <h3 className="text-sm font-semibold truncate">
          {game.app_title}
        </h3>
      </div>
    </div>
  );
}
