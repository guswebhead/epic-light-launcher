import { invoke } from "@tauri-apps/api/core";
import {
  normalizeSupabaseSession,
  type SupabaseSession,
} from "../services/syncSettingsService";

export async function getSecureSupabaseSession(): Promise<SupabaseSession | null> {
  const raw = await invoke<string | null>("secure_store_get_supabase_session");
  if (!raw) {
    return null;
  }

  try {
    return normalizeSupabaseSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveSecureSupabaseSession(
  session: SupabaseSession
): Promise<void> {
  await invoke("secure_store_set_supabase_session", {
    session_json: JSON.stringify(session),
  });
}

export async function clearSecureSupabaseSession(): Promise<void> {
  await invoke("secure_store_clear_supabase_session");
}
