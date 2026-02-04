import { invoke } from "@tauri-apps/api/core";

export async function fetchHighlights() {
  const data = await invoke<any>("get_store_games");
  return data.data.Catalog.searchStore.elements;
}
