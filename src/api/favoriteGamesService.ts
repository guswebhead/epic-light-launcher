export type FavoriteGame = {
  title: string;
  slug: string;
};

const STORAGE_KEY = "favorite_games";

export function getFavoriteGames(): FavoriteGame[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function addFavoriteGame(game: FavoriteGame) {
  const games = getFavoriteGames();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...games, game]));
}

export function removeFavoriteGame(slug: string) {
  const games = getFavoriteGames().filter(g => g.slug !== slug);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}
