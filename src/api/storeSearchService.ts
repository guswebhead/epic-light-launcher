import { invoke } from "@tauri-apps/api/core";

export async function fetchAllGames(start = 0) {
  const data = await invoke<any>("search_store_games", { start });
  return data.data.catalog.searchStore.elements;
}
