export type SyncProvider = "local" | "supabase";

export type SupabaseSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  expiresAt: number;
};

export type SyncSettings = {
  provider: SyncProvider;
  supabaseUrl: string;
  supabaseAnonKey: string;
  autoSync: boolean;
};

const STORAGE_KEY = "omega_sync_settings_v1";

const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  provider: "local",
  supabaseUrl: "",
  supabaseAnonKey: "",
  autoSync: false,
};

export function normalizeSupabaseSession(raw: unknown): SupabaseSession | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const session = raw as Partial<SupabaseSession>;
  const accessToken =
    typeof session.accessToken === "string" ? session.accessToken.trim() : "";
  const refreshToken =
    typeof session.refreshToken === "string" ? session.refreshToken.trim() : "";
  const userId = typeof session.userId === "string" ? session.userId.trim() : "";
  const email = typeof session.email === "string" ? session.email.trim() : "";
  const expiresAt =
    typeof session.expiresAt === "number" && Number.isFinite(session.expiresAt)
      ? session.expiresAt
      : 0;

  if (!accessToken || !refreshToken || !userId || expiresAt <= 0) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    userId,
    email,
    expiresAt,
  };
}

function normalizeSettings(raw: unknown): SyncSettings {
  const value = (raw ?? {}) as Partial<SyncSettings>;
  const provider: SyncProvider =
    value.provider === "supabase" ? "supabase" : "local";

  return {
    provider,
    supabaseUrl: typeof value.supabaseUrl === "string" ? value.supabaseUrl : "",
    supabaseAnonKey:
      typeof value.supabaseAnonKey === "string" ? value.supabaseAnonKey : "",
    autoSync: Boolean(value.autoSync),
  };
}

export function getSyncSettings(): SyncSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_SYNC_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed);
  } catch {
    return DEFAULT_SYNC_SETTINGS;
  }
}

export function saveSyncSettings(next: SyncSettings): SyncSettings {
  const normalized = normalizeSettings(next);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function updateSyncSettings(
  partial: Partial<SyncSettings>
): SyncSettings {
  const merged = {
    ...getSyncSettings(),
    ...partial,
  };
  return saveSyncSettings(merged);
}

export function isSupabaseConfigured(settings: SyncSettings): boolean {
  return (
    settings.provider === "supabase" &&
    settings.supabaseUrl.trim().length > 0 &&
    settings.supabaseAnonKey.trim().length > 0
  );
}

export function isSupabaseSessionValid(
  session: SupabaseSession | null,
  minSecondsLeft = 30
): boolean {
  if (!session) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  return session.expiresAt - now > minSecondsLeft;
}

export function isSupabaseAuthenticated(
  session: SupabaseSession | null
): boolean {
  return isSupabaseSessionValid(session, -300);
}
