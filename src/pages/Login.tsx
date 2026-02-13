import { FormEvent, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "register";

export function Login() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | null;
    const target = state?.from?.pathname;
    if (!target || target === "/login") {
      return "/";
    }
    return target;
  }, [location.state]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-200">
        Carregando sessao...
      </div>
    );
  }

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setMessage("Usuario e senha sao obrigatorios.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setMessage("As senhas nao conferem.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "register") {
        await register(trimmedUsername, password);
      } else {
        await login(trimmedUsername, password);
      }
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no login local.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4 text-gray-100">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900/80 p-6 shadow-2xl">
        <h1 className="text-2xl font-bold">Omega Login Local</h1>
        <p className="mt-2 text-sm text-gray-400">
          MVP offline com SQLite local no Tauri.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage(null);
            }}
            className={`rounded px-3 py-2 text-sm font-medium transition ${
              mode === "login"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setMessage(null);
            }}
            className={`rounded px-3 py-2 text-sm font-medium transition ${
              mode === "register"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">Usuario</label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="ex: omega_player"
              className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Letras, numeros, ponto, underscore e hifen.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Confirmar senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          )}

          {message && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {submitting
              ? "Processando..."
              : mode === "register"
                ? "Criar conta local"
                : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
