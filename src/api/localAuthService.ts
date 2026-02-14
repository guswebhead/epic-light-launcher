import { invoke } from "@tauri-apps/api/core";

export type LocalAuthUser = {
  id: number;
  username: string;
  createdAt: string;
};

export type LocalUserGameData = {
  appName: string;
  customTags: string[];
  notes: string;
  playtimeMinutes: number;
  rating: number | null;
  updatedAt: string;
};

export type LocalUserGameDataInput = {
  appName: string;
  customTags: string[];
  notes: string;
  playtimeMinutes: number;
  rating: number | null;
};

export async function registerLocalUser(
  username: string,
  password: string
): Promise<LocalAuthUser> {
  return invoke<LocalAuthUser>("local_auth_register", { username, password });
}

export async function loginLocalUser(
  username: string,
  password: string
): Promise<LocalAuthUser> {
  return invoke<LocalAuthUser>("local_auth_login", { username, password });
}

export async function logoutLocalUser(): Promise<void> {
  await invoke("local_auth_logout");
}

export async function getCurrentLocalUser(): Promise<LocalAuthUser | null> {
  return invoke<LocalAuthUser | null>("local_auth_current_user");
}

export async function upsertLocalUserGameData(
  input: LocalUserGameDataInput
): Promise<LocalUserGameData> {
  return invoke<LocalUserGameData>("local_user_game_data_upsert", {
    app_name: input.appName,
    custom_tags: input.customTags,
    notes: input.notes,
    playtime_minutes: input.playtimeMinutes,
    rating: input.rating,
  });
}

export async function getLocalUserGameData(
  appName: string
): Promise<LocalUserGameData | null> {
  return invoke<LocalUserGameData | null>("local_user_game_data_get", {
    app_name: appName,
  });
}

export async function listLocalUserGameData(): Promise<LocalUserGameData[]> {
  return invoke<LocalUserGameData[]>("local_user_game_data_list");
}
