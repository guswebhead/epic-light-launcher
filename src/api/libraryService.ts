import axios from "axios";

const API_URL =
  "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions";

export async function fetchFreeGames() {
  try {
    const response = await axios.get(API_URL);
    console.log("Resposta da API:", response.data);

    const games = response.data.data.Catalog.searchStore.elements;
    console.log("Jogos extraídos:", games);

    return games;
  } catch (error) {
    console.error("Erro ao buscar jogos:", error);
    return [];
  }
}
