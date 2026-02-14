import {
  getLocalUserGameData,
  listLocalUserGameData,
  upsertLocalUserGameData,
  type LocalUserGameData,
  type LocalUserGameDataInput,
} from "./localAuthService";
import type { SyncProvider } from "../services/syncSettingsService";

/**
 * Backend status for user data storage.
 * Currently only supports local SQLite storage.
 */
export type UserDataBackendStatus = {
  requestedProvider: SyncProvider;
  activeProvider: "local" | "supabase";
  cloudConfigured: boolean;
  cloudAdapterReady: boolean;
  authenticated: boolean;
  autoSync: boolean;
  note: string;
};

/**
 * Sync result for manual data sync operations.
 * Currently only supports local-only mode.
 */
export type SyncNowResult = {
  mode: "local_only";
  totalMerged: number;
  localWrites: number;
  cloudWrites: number;
  message: string;
};

/**
 * Get the current backend status for user data storage.
 * @returns Backend status indicating local-only mode
 */
export async function getUserDataBackendStatus(): Promise<UserDataBackendStatus> {
  return {
    requestedProvider: "local",
    activeProvider: "local",
    cloudConfigured: false,
    cloudAdapterReady: true,
    authenticated: false,
    autoSync: false,
    note: "Modo local apenas. Dados armazenados em SQLite no Tauri.",
  };
}

/**
 * Get game data for a specific app.
 * @param appName - The app name to retrieve data for
 * @returns Game data or null if not found
 */
export async function getUserGameData(
  appName: string
): Promise<LocalUserGameData | null> {
  return getLocalUserGameData(appName);
}

/**
 * Save or update game data.
 * @param input - The game data to save
 * @returns The saved game data with updated timestamp
 */
export async function upsertUserGameData(
  input: LocalUserGameDataInput
): Promise<LocalUserGameData> {
  return upsertLocalUserGameData(input);
}

/**
 * List all user game data.
 * @returns Array of game data sorted by updated date (newest first)
 */
export async function listUserGameData(): Promise<LocalUserGameData[]> {
  const items = await listLocalUserGameData();
  return items.sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
}

/**
 * Sync user data (currently no-op for local-only mode).
 * @returns Sync result indicating local-only operation
 */
export async function syncUserDataNow(): Promise<SyncNowResult> {
  const items = await listLocalUserGameData();
  return {
    mode: "local_only",
    totalMerged: items.length,
    localWrites: 0,
    cloudWrites: 0,
    message: "Modo local apenas. Todos os dados são armazenados localmente no SQLite.",
  };
}
