interface LibraryErrorAlertProps {
  errorMessage: string;
  needsAuth: boolean;
  authLoading: boolean;
  onReauth: () => void;
}

/**
 * Alerta de erro com opção de reautenticação
 */
export function LibraryErrorAlert({
  errorMessage,
  needsAuth,
  authLoading,
  onReauth,
}: LibraryErrorAlertProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
      <span>{errorMessage}</span>
      {needsAuth && (
        <button
          onClick={onReauth}
          disabled={authLoading}
          className="rounded bg-red-500/20 px-3 py-1 text-sm font-medium text-red-100 hover:bg-red-500/30 disabled:opacity-60"
        >
          {authLoading ? "Reautenticando..." : "Reautenticar"}
        </button>
      )}
    </div>
  );
}
