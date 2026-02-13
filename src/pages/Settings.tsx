import { useEffect, useState } from "react";
import {
  clearStoreCookie,
  clearStoreUserAgent,
  getStoreCookiePath,
  getStoreCookieStatus,
  getStoreUserAgentPath,
  getStoreUserAgentStatus,
  setStoreCookie,
  setStoreUserAgent,
} from "../api/storeSettingsService";
import {
  getUserDataBackendStatus,
  syncUserDataNow,
} from "../api/userDataService";
// Supabase support removed
// import {
//   supabaseSignInWithPassword,
//   supabaseSignOut,
//   supabaseSignUpWithPassword,
// } from "../api/supabaseAuthService";
import {
  clearSecureSupabaseSession,
  getSecureSupabaseSession,
} from "../api/secureSessionStorageService";
import {
  getSyncSettings,
  isSupabaseAuthenticated,
  saveSyncSettings,
  type SupabaseSession,
  type SyncProvider,
  type SyncSettings,
} from "../services/syncSettingsService";

function persistSyncSettingsFromForm(
  provider: SyncProvider,
  autoSync: boolean,
  supabaseUrl: string,
  supabaseAnonKey: string
): { settings: SyncSettings; credentialsChanged: boolean } {
  const current = getSyncSettings();
  const nextUrl = supabaseUrl.trim();
  const nextAnonKey = supabaseAnonKey.trim();
  const urlChanged = current.supabaseUrl.trim() !== nextUrl;
  const keyChanged = current.supabaseAnonKey.trim() !== nextAnonKey;

  const settings = saveSyncSettings({
    provider,
    autoSync,
    supabaseUrl: nextUrl,
    supabaseAnonKey: nextAnonKey,
  });

  return { settings, credentialsChanged: urlChanged || keyChanged };
}

function sessionDescription(session: SupabaseSession | null): string {
  if (!session) {
    return "nao autenticado";
  }
  const expires = new Date(session.expiresAt * 1000).toLocaleString();
  const identity = session.email || session.userId;
  return `autenticado como ${identity} (expira em ${expires})`;
}

export function Settings() {
  const [cookiePath, setCookiePath] = useState<string>("");
  const [hasCookie, setHasCookie] = useState<boolean>(false);
  const [cookieValue, setCookieValue] = useState<string>("");
  const [userAgentPath, setUserAgentPath] = useState<string>("");
  const [hasUserAgent, setHasUserAgent] = useState<boolean>(false);
  const [userAgentValue, setUserAgentValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  const [syncProvider, setSyncProvider] = useState<SyncProvider>("local");
  const [syncAutoEnabled, setSyncAutoEnabled] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [showSupabaseAnonKey, setShowSupabaseAnonKey] = useState(false);
  const [supabaseEmail, setSupabaseEmail] = useState("");
  const [supabasePassword, setSupabasePassword] = useState("");

  const [syncSaving, setSyncSaving] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncNowLoading, setSyncNowLoading] = useState(false);
  const [syncNowMessage, setSyncNowMessage] = useState("");
  const [backendStatusSummary, setBackendStatusSummary] = useState("");
  const [supabaseSessionLabel, setSupabaseSessionLabel] =
    useState("nao autenticado");
  const [supabaseAuthLoading, setSupabaseAuthLoading] = useState(false);
  const [supabaseAuthMessage, setSupabaseAuthMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const [
          path,
          status,
          uaPath,
          uaStatus,
          secureSession,
          backendStatus,
        ] = await Promise.all([
          getStoreCookiePath(),
          getStoreCookieStatus(),
          getStoreUserAgentPath(),
          getStoreUserAgentStatus(),
          getSecureSupabaseSession(),
          getUserDataBackendStatus(),
        ]);

        if (!active) {
          return;
        }

        setCookiePath(path);
        setHasCookie(status);
        setUserAgentPath(uaPath);
        setHasUserAgent(uaStatus);

        const syncSettings = getSyncSettings();
        setSyncProvider(syncSettings.provider);
        setSyncAutoEnabled(syncSettings.autoSync);
        setSupabaseUrl(syncSettings.supabaseUrl);
        setSupabaseAnonKey(syncSettings.supabaseAnonKey);
        setSupabaseEmail(secureSession?.email ?? "");
        setSupabaseSessionLabel(sessionDescription(secureSession));
        setBackendStatusSummary(backendStatus.note);
      } catch (err) {
        console.error(err);
        if (active) {
          setMessage("Nao foi possivel carregar configuracoes da Store.");
        }
      }
    }

    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await setStoreCookie(cookieValue);
      setHasCookie(true);
      setCookieValue("");
      setMessage("Cookie salvo com sucesso.");
    } catch (err) {
      console.error(err);
      setMessage("Falha ao salvar cookie. Verifique o valor.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setMessage("");
    try {
      await clearStoreCookie();
      setHasCookie(false);
      setMessage("Cookie removido.");
    } catch (err) {
      console.error(err);
      setMessage("Falha ao remover cookie.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUserAgent = async () => {
    setSaving(true);
    setMessage("");
    try {
      await setStoreUserAgent(userAgentValue);
      setHasUserAgent(true);
      setUserAgentValue("");
      setMessage("User-Agent salvo com sucesso.");
    } catch (err) {
      console.error(err);
      setMessage("Falha ao salvar User-Agent. Verifique o valor.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearUserAgent = async () => {
    setSaving(true);
    setMessage("");
    try {
      await clearStoreUserAgent();
      setHasUserAgent(false);
      setMessage("User-Agent removido.");
    } catch (err) {
      console.error(err);
      setMessage("Falha ao remover User-Agent.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSyncSettings = async () => {
    setSyncSaving(true);
    setSyncMessage("");
    setSyncNowMessage("");
    setSupabaseAuthMessage("");

    try {
      const { settings, credentialsChanged } = persistSyncSettingsFromForm(
        syncProvider,
        syncAutoEnabled,
        supabaseUrl,
        supabaseAnonKey
      );

      if (credentialsChanged) {
        await clearSecureSupabaseSession();
      }

      const secureSession = credentialsChanged
        ? null
        : await getSecureSupabaseSession();
      const cloudReady = isSupabaseAuthenticated(secureSession);

      if (settings.provider === "supabase" && !cloudReady) {
        setSyncMessage(
          "Supabase salvo. Falta autenticar no cloud para ativar sync seguro."
        );
      } else if (settings.provider === "supabase") {
        setSyncMessage("Supabase salvo e autenticado.");
      } else {
        setSyncMessage("Sync salvo em modo local offline.");
      }

      setSupabaseSessionLabel(sessionDescription(secureSession));
      setBackendStatusSummary((await getUserDataBackendStatus()).note);
    } catch (error) {
      console.error(error);
      setSyncMessage("Falha ao salvar configuracao de sync.");
    } finally {
      setSyncSaving(false);
    }
  };

  const handleSupabaseSignIn = async () => {
    setSupabaseAuthLoading(true);
    setSupabaseAuthMessage("");

    try {
      setSupabaseAuthMessage("Supabase removido - use autenticação local apenas");
    } catch (error) {
      console.error(error);
      setSupabaseAuthMessage("Supabase foi removido do projeto.");
    } finally {
      setSupabaseAuthLoading(false);
    }
  };
  const handleSupabaseSignUp = async () => {
    setSupabaseAuthLoading(true);
    try {
      setSupabaseAuthMessage("Supabase removido - use autenticação local apenas");
    } finally {
      setSupabaseAuthLoading(false);
    }
  };

  const handleSupabaseLogout = async () => {
    setSupabaseAuthLoading(true);
    try {
      await clearSecureSupabaseSession();
      setSupabaseSessionLabel("nao autenticado");
      setBackendStatusSummary((await getUserDataBackendStatus()).note);
      setSupabaseAuthMessage("Supabase foi removido.");
    } catch (error) {
      console.error(error);
      setSupabaseAuthMessage("Erro.");
    } finally {
      setSupabaseAuthLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncNowLoading(true);
    setSyncNowMessage("");

    try {
      const result = await syncUserDataNow();
      setSyncNowMessage(
        `${result.message} Local: ${result.localWrites} | Cloud: ${result.cloudWrites}.`
      );
      setBackendStatusSummary((await getUserDataBackendStatus()).note);
    } catch (error) {
      console.error(error);
      setSyncNowMessage("Falha ao executar sync manual.");
    } finally {
      setSyncNowLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-400">
          Configure o cookie da Epic Store para liberar o GraphQL (promocoes e
          catalogo).
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div>
          <h2 className="text-lg font-semibold">Cookie da Store</h2>
          <p className="text-sm text-gray-400">
            Copie o header Cookie completo da request em
            <span className="text-gray-300"> store.epicgames.com/graphql</span>.
          </p>
        </div>

        <div className="text-sm text-gray-400">
          <div>Status: {hasCookie ? "configurado" : "nao configurado"}</div>
          {cookiePath && (
            <div>
              Caminho local: <span className="text-gray-300">{cookiePath}</span>
            </div>
          )}
        </div>

        <textarea
          value={cookieValue}
          onChange={(event) => setCookieValue(event.target.value)}
          placeholder="Cole o Cookie completo aqui"
          className="h-32 w-full rounded border border-gray-800 bg-gray-950 p-3 text-sm text-gray-100"
        />

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || cookieValue.trim().length === 0}
            className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar cookie"}
          </button>
          <button
            onClick={handleClear}
            disabled={saving}
            className="rounded bg-gray-700 px-4 py-2 hover:bg-gray-600 disabled:opacity-60"
          >
            Remover cookie
          </button>
        </div>

        {message && <p className="text-sm text-gray-300">{message}</p>}
        <p className="text-xs text-gray-500">
          O cookie expira. Quando parar de funcionar, repita o processo no
          navegador e cole novamente.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div>
          <h2 className="text-lg font-semibold">User-Agent da Store</h2>
          <p className="text-sm text-gray-400">
            Copie o User-Agent usado na mesma request do Cookie (DevTools -
            Request Headers).
          </p>
        </div>

        <div className="text-sm text-gray-400">
          <div>Status: {hasUserAgent ? "configurado" : "nao configurado"}</div>
          {userAgentPath && (
            <div>
              Caminho local:{" "}
              <span className="text-gray-300">{userAgentPath}</span>
            </div>
          )}
        </div>

        <textarea
          value={userAgentValue}
          onChange={(event) => setUserAgentValue(event.target.value)}
          placeholder="Cole o User-Agent completo aqui"
          className="h-24 w-full rounded border border-gray-800 bg-gray-950 p-3 text-sm text-gray-100"
        />

        <div className="flex gap-3">
          <button
            onClick={handleSaveUserAgent}
            disabled={saving || userAgentValue.trim().length === 0}
            className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar User-Agent"}
          </button>
          <button
            onClick={handleClearUserAgent}
            disabled={saving}
            className="rounded bg-gray-700 px-4 py-2 hover:bg-gray-600 disabled:opacity-60"
          >
            Remover User-Agent
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div>
          <h2 className="text-lg font-semibold">Sync de Dados (Fase 2)</h2>
          <p className="text-sm text-gray-400">
            Sincronizacao opcional com Supabase usando sessao autenticada e
            fallback para SQLite local.
          </p>
          {backendStatusSummary && (
            <p className="mt-1 text-xs text-gray-500">
              Status atual: {backendStatusSummary}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Sessao cloud: {supabaseSessionLabel}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-300">Provider</label>
            <select
              value={syncProvider}
              onChange={(event) =>
                setSyncProvider(event.target.value as SyncProvider)
              }
              className="w-full rounded border border-gray-800 bg-gray-950 p-2 text-sm text-gray-100"
            >
              <option value="local">Local (SQLite offline)</option>
              <option value="supabase">Supabase (cloud - opcional)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="sync-auto"
              type="checkbox"
              checked={syncAutoEnabled}
              onChange={(event) => setSyncAutoEnabled(event.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="sync-auto" className="text-sm text-gray-300">
              Tentar sincronizacao automatica quando cloud estiver ativa
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-gray-300">
              Supabase URL
            </label>
            <input
              value={supabaseUrl}
              onChange={(event) => setSupabaseUrl(event.target.value)}
              placeholder="https://seu-projeto.supabase.co"
              className="w-full rounded border border-gray-800 bg-gray-950 p-2 text-sm text-gray-100"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-gray-300">
              Supabase Anon Key
            </label>
            <div className="flex gap-2">
              <input
                type={showSupabaseAnonKey ? "text" : "password"}
                value={supabaseAnonKey}
                onChange={(event) => setSupabaseAnonKey(event.target.value)}
                placeholder="Cole a anon key publica aqui"
                className="w-full rounded border border-gray-800 bg-gray-950 p-2 text-sm text-gray-100"
              />
              <button
                type="button"
                onClick={() => setShowSupabaseAnonKey((value) => !value)}
                className="rounded bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600"
              >
                {showSupabaseAnonKey ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSaveSyncSettings}
            disabled={syncSaving}
            className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500 disabled:opacity-60"
          >
            {syncSaving ? "Salvando..." : "Salvar sync"}
          </button>
          <button
            onClick={handleSyncNow}
            disabled={syncNowLoading}
            className="rounded bg-emerald-600 px-4 py-2 hover:bg-emerald-500 disabled:opacity-60"
          >
            {syncNowLoading ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        </div>

        <div className="space-y-3 rounded border border-gray-800 bg-gray-950/50 p-3">
          <p className="text-sm text-gray-300">Autenticacao Supabase (RLS)</p>

          <input
            value={supabaseEmail}
            onChange={(event) => setSupabaseEmail(event.target.value)}
            placeholder="email@exemplo.com"
            className="w-full rounded border border-gray-800 bg-gray-950 p-2 text-sm text-gray-100"
          />
          <input
            type="password"
            value={supabasePassword}
            onChange={(event) => setSupabasePassword(event.target.value)}
            placeholder="Senha do Supabase Auth"
            className="w-full rounded border border-gray-800 bg-gray-950 p-2 text-sm text-gray-100"
          />

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSupabaseSignIn}
              disabled={supabaseAuthLoading}
              className="rounded bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              Entrar cloud
            </button>
            <button
              onClick={handleSupabaseSignUp}
              disabled={supabaseAuthLoading}
              className="rounded bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500 disabled:opacity-60"
            >
              Criar conta cloud
            </button>
            <button
              onClick={handleSupabaseLogout}
              disabled={supabaseAuthLoading}
              className="rounded bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600 disabled:opacity-60"
            >
              Sair cloud
            </button>
          </div>
        </div>

        {syncMessage && <p className="text-sm text-gray-300">{syncMessage}</p>}
        {syncNowMessage && (
          <p className="text-sm text-gray-300">{syncNowMessage}</p>
        )}
        {supabaseAuthMessage && (
          <p className="text-sm text-gray-300">{supabaseAuthMessage}</p>
        )}
      </div>
    </div>
  );
}
