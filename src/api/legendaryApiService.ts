import { invoke } from "@tauri-apps/api/core";

export async function getEpicLibrary() {
  const data = await invoke<string>("legendary_list_games");
  return JSON.parse(data);
}

export async function getInstalledEpicGames() {
  const data = await invoke<string>("legendary_list_installed");
  return JSON.parse(data);
}
