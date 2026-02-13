import type { EpicGame, StoreGame, GameImage } from "../types/EpicGame";

/**
 * Get the best available image URL for a game
 * Priority: DieselGameBoxTall > DieselGameBox > first available > placeholder
 */
export function getGameImage(game: EpicGame | StoreGame | undefined): string {
  if (!game) return "/placeholder.png";

  const images = "metadata" in game ? game.metadata?.keyImages : game.keyImages;

  if (!images || !Array.isArray(images)) return "/placeholder.png";

  const tall = images.find((img: GameImage) => img.type === "DieselGameBoxTall");
  const wide = images.find((img: GameImage) => img.type === "DieselGameBox");

  return tall?.url || wide?.url || images[0]?.url || "/placeholder.png";
}
