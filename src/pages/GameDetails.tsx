import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getEpicGameDetails } from "../api/legendaryApiService";
import {
  getUserDataBackendStatus,
  getUserGameData,
  upsertUserGameData,
  type UserDataBackendStatus,
} from "../api/userDataService";
import { getGameImage } from "../utils/getGameImage";
import type { EpicGame } from "../types/EpicGame";

type LocalSaveStatus = "success" | "error" | null;

interface LocationState {
  game?: EpicGame;
}

export function GameDetails() {
  const { appName } = useParams();
  const location = useLocation();
  const stateGame = (location.state as LocationState | null)?.game;

  const [game, setGame] = useState<EpicGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [localDataLoading, setLocalDataLoading] = useState(true);
  const [localSaveStatus, setLocalSaveStatus] = useState<LocalSaveStatus>(null);
  const [localDataMessage, setLocalDataMessage] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] =
    useState<UserDataBackendStatus | null>(null);
  const [savingLocalData, setSavingLocalData] = useState(false);
  const [customTagsInput, setCustomTagsInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [playtimeInput, setPlaytimeInput] = useState("0");
  const [ratingInput, setRatingInput] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadGame() {
      setLoading(true);
      setErrorMessage(null);

      if (stateGame && stateGame.app_name === appName) {
        setGame(stateGame);
        setLoading(false);
        return;
      }

      if (!appName) {
        setGame(null);
        setErrorMessage("Jogo nao encontrado.");
        setLoading(false);
        return;
      }

      try {
        const selected = await getEpicGameDetails(appName);
        if (!cancelled) {
          setGame(selected);
        }
      } catch (error) {
        console.error("Erro ao carregar detalhes do jogo:", error);
        if (!cancelled) {
          setErrorMessage("Falha ao carregar detalhes do jogo.");
          setGame(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGame();

    return () => {
      cancelled = true;
    };
  }, [appName, stateGame]);

  useEffect(() => {
    let cancelled = false;

    async function loadLocalData() {
      if (!appName) {
        setLocalDataLoading(false);
        return;
      }

      setLocalDataLoading(true);
      setLocalDataMessage(null);
      setLocalSaveStatus(null);
      const status = await getUserDataBackendStatus();
      if (!cancelled) {
        setBackendStatus(status);
      }

      try {
        const localData = await getUserGameData(appName);
        if (cancelled) {
          return;
        }

        setCustomTagsInput(localData?.customTags.join(", ") ?? "");
        setNotesInput(localData?.notes ?? "");
        setPlaytimeInput(String(localData?.playtimeMinutes ?? 0));
        setRatingInput(
          typeof localData?.rating === "number" ? String(localData.rating) : ""
        );
      } catch (error) {
        console.error("Erro ao carregar dados locais do jogo:", error);
        if (!cancelled) {
          setLocalSaveStatus("error");
          setLocalDataMessage("Nao foi possivel carregar os dados locais.");
        }
      } finally {
        if (!cancelled) {
          setLocalDataLoading(false);
        }
      }
    }

    loadLocalData();
    return () => {
      cancelled = true;
    };
  }, [appName]);

  const handleSaveLocalData = async () => {
    if (!appName) {
      return;
    }

    const parsedPlaytime = Number.parseInt(playtimeInput, 10);
    const playtimeMinutes =
      Number.isFinite(parsedPlaytime) && parsedPlaytime > 0 ? parsedPlaytime : 0;

    const parsedRating = Number.parseInt(ratingInput, 10);
    const rating =
      Number.isFinite(parsedRating) && parsedRating >= 1 && parsedRating <= 5
        ? parsedRating
        : null;

    const tags = customTagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      setSavingLocalData(true);
      setLocalDataMessage(null);
      setLocalSaveStatus(null);

      const saved = await upsertUserGameData({
        appName,
        customTags: tags,
        notes: notesInput,
        playtimeMinutes,
        rating,
      });

      setCustomTagsInput(saved.customTags.join(", "));
      setNotesInput(saved.notes);
      setPlaytimeInput(String(saved.playtimeMinutes));
      setRatingInput(
        typeof saved.rating === "number" ? String(saved.rating) : ""
      );

      setLocalSaveStatus("success");
      setLocalDataMessage("Dados locais salvos com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar dados locais do jogo:", error);
      setLocalSaveStatus("error");
      setLocalDataMessage(
        error instanceof Error
          ? error.message
          : "Falha ao salvar dados locais do jogo."
      );
    } finally {
      setSavingLocalData(false);
    }
  };

  const title: string =
    (game?.app_title as string | undefined) ??
    (game?.title as string | undefined) ??
    (game?.metadata?.title as string | undefined) ??
    (game?.metadata?.name as string | undefined) ??
    appName ??
    "Jogo";

  const description: string =
    (game?.metadata?.description as string | undefined) ??
    (game?.metadata?.shortDescription as string | undefined) ??
    (game?.metadata?.longDescription as string | undefined) ??
    (game?.description as string | undefined) ??
    "";

  const infoItems = useMemo(() => {
    const categories = game?.metadata?.categories ?? game?.categories;
    const categoryLabel = Array.isArray(categories)
      ? categories
          .map((cat: any) => cat?.path ?? cat?.name ?? cat)
          .filter(Boolean)
          .join(", ")
      : categories;

    return [
      { label: "App Name", value: game?.app_name },
      { label: "Namespace", value: game?.namespace },
      {
        label: "Desenvolvedor",
        value: game?.metadata?.developer ?? game?.developer,
      },
      { label: "Publisher", value: game?.metadata?.publisher ?? game?.publisher },
      { label: "Categoria", value: categoryLabel },
      { label: "Release", value: game?.metadata?.releaseDate ?? game?.releaseDate },
    ].filter((item) => Boolean(item.value));
  }, [game]);

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (errorMessage) {
    return <p className="text-red-200">{errorMessage}</p>;
  }

  if (!game) {
    return <p>Jogo nao encontrado.</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <img src={getGameImage(game)} alt={title} className="w-full rounded shadow-lg" />

        <div className="rounded bg-gray-800/60 p-3 text-sm text-gray-300">
          {infoItems.map((item) => (
            <div key={item.label} className="flex justify-between gap-2">
              <span className="text-gray-400">{item.label}</span>
              <span className="text-right text-gray-100">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {game?.app_name && (
            <p className="text-sm text-gray-400">AppName: {game.app_name}</p>
          )}
        </div>

        {description && <p className="leading-relaxed text-gray-300">{description}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            className="cursor-not-allowed rounded bg-green-600 px-4 py-2 opacity-60"
            disabled
          >
            Jogar
          </button>
          <button
            className="cursor-not-allowed rounded bg-blue-600 px-4 py-2 opacity-60"
            disabled
          >
            Abrir na Epic
          </button>
        </div>

        <div className="space-y-4 rounded border border-gray-800 bg-gray-800/50 p-4">
          <div>
            <h2 className="text-lg font-semibold">Dados de Usuario (Local/Cloud)</h2>
            <p className="text-sm text-gray-400">
              Tags customizadas, notas, tempo jogado e rating com fallback offline.
            </p>
            {backendStatus && (
              <p className="mt-1 text-xs text-gray-500">
                Provider solicitado: {backendStatus.requestedProvider} | ativo:{" "}
                {backendStatus.activeProvider}. {backendStatus.note}
              </p>
            )}
          </div>

          {localDataLoading ? (
            <p className="text-sm text-gray-400">Carregando dados locais...</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-gray-300">
                    Tags (separadas por virgula)
                  </label>
                  <input
                    value={customTagsInput}
                    onChange={(event) => setCustomTagsInput(event.target.value)}
                    placeholder="coop, backlog, terminar"
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300">
                    Tempo jogado (minutos)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={playtimeInput}
                    onChange={(event) => setPlaytimeInput(event.target.value)}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300">Rating</label>
                  <select
                    value={ratingInput}
                    onChange={(event) => setRatingInput(event.target.value)}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
                  >
                    <option value="">Sem nota</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-gray-300">Notas</label>
                  <textarea
                    value={notesInput}
                    onChange={(event) => setNotesInput(event.target.value)}
                    rows={5}
                    placeholder="Resumo rapido do que voce achou do jogo..."
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveLocalData}
                  disabled={savingLocalData}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {savingLocalData ? "Salvando..." : "Salvar dados locais"}
                </button>

                {localDataMessage && (
                  <p
                    className={`text-sm ${
                      localSaveStatus === "error"
                        ? "text-red-200"
                        : "text-green-300"
                    }`}
                  >
                    {localDataMessage}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
