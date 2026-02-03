import axios from "axios";

const API_URL =
  "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions";

export async function fetchFreeGames() {
  const cached = localStorage.getItem("freeGames");

  if (cached) {
    return JSON.parse(cached);
  }

  const response = await axios.get(API_URL);
  const games = response.data.data.Catalog.searchStore.elements;

  localStorage.setItem("freeGames", JSON.stringify(games));
  return games;
}
