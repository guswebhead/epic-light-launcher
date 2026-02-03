import axios from "axios";

const BASE_URL =
  "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions";

export async function fetchFreeGames() {
  const response = await axios.get(BASE_URL);
  return response.data.data.Catalog.searchStore.elements;
}
