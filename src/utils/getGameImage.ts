export function getGameImage(game: any): string {
  const images = game.metadata?.keyImages;

  if (!images) return "/placeholder.png";

  const tall = images.find((img: any) => img.type === "DieselGameBoxTall");
  const wide = images.find((img: any) => img.type === "DieselGameBox");

  return tall?.url || wide?.url || "/placeholder.png";
}
