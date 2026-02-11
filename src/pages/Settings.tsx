import { useEffect, useState } from "react";
import {
  clearStoreCookie,
  getStoreCookiePath,
  getStoreCookieStatus,
  getStoreUserAgentPath,
  getStoreUserAgentStatus,
  setStoreCookie,
  setStoreUserAgent,
  clearStoreUserAgent,
} from "../api/storeSettingsService";

export function Settings() {
  const [cookiePath, setCookiePath] = useState<string>("");
  const [hasCookie, setHasCookie] = useState<boolean>(false);
  const [cookieValue, setCookieValue] = useState<string>("");
  const [userAgentPath, setUserAgentPath] = useState<string>("");
  const [hasUserAgent, setHasUserAgent] = useState<boolean>(false);
  const [userAgentValue, setUserAgentValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let active = true;
    Promise.all([
      getStoreCookiePath(),
      getStoreCookieStatus(),
      getStoreUserAgentPath(),
      getStoreUserAgentStatus(),
    ])
      .then(([path, status, uaPath, uaStatus]) => {
        if (!active) {
          return;
        }
        setCookiePath(path);
        setHasCookie(status);
        setUserAgentPath(uaPath);
        setHasUserAgent(uaStatus);
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setMessage("Nao foi possivel carregar configuracoes da Store.");
        }
      });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-400">
          Configure o cookie da Epic Store para liberar o GraphQL (promocoes e
          catalogo).
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
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
          className="w-full h-32 bg-gray-950 border border-gray-800 rounded p-3 text-sm text-gray-100"
        />

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || cookieValue.trim().length === 0}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-4 py-2 rounded"
          >
            {saving ? "Salvando..." : "Salvar cookie"}
          </button>
          <button
            onClick={handleClear}
            disabled={saving}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-60 px-4 py-2 rounded"
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

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">User-Agent da Store</h2>
          <p className="text-sm text-gray-400">
            Copie o User-Agent usado na mesma request do Cookie (DevTools
            - Request Headers).
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
          className="w-full h-24 bg-gray-950 border border-gray-800 rounded p-3 text-sm text-gray-100"
        />

        <div className="flex gap-3">
          <button
            onClick={handleSaveUserAgent}
            disabled={saving || userAgentValue.trim().length === 0}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-4 py-2 rounded"
          >
            {saving ? "Salvando..." : "Salvar User-Agent"}
          </button>
          <button
            onClick={handleClearUserAgent}
            disabled={saving}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-60 px-4 py-2 rounded"
          >
            Remover User-Agent
          </button>
        </div>
      </div>
    </div>
  );
}
