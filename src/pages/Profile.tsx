import { useEffect, useMemo, useState } from "react";
import {
  getEpicLibraryPaginated,
  getEpicProfileBasic,
  getEpicWishlist,
  getEpicFriends,
  getLegendaryStatus,
} from "../api/legendaryApiService";

type ProfileData = {
  displayName: string;
  avatarUrl?: string;
};

export function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [totalGames, setTotalGames] = useState<number | null>(null);
  const [installedGames, setInstalledGames] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);

  const getGraphqlFriendlyError = (error: unknown) => {
    const message = String(error ?? "");
    if (message.toLowerCase().includes("cloudflare")) {
      return "Epic bloqueou o acesso (Cloudflare). Wishlist e amigos indisponiveis.";
    }
    if (message.toLowerCase().includes("dns") || message.toLowerCase().includes("host")) {
      return "Falha de DNS ao acessar a Epic. Verifique sua conexao.";
    }
    if (message.toLowerCase().includes("indisponivel")) {
      return "Endpoint da Epic indisponivel no momento.";
    }
    return "Falha ao carregar dados da Epic.";
  };

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [status, library, basicProfile] = await Promise.all([
          getLegendaryStatus(),
          getEpicLibraryPaginated(1, 1),
          getEpicProfileBasic().catch(() => null),
        ]);

        const [wishlistResult, friendsResult] = await Promise.allSettled([
          getEpicWishlist(),
          getEpicFriends(),
        ]);

        if (cancelled) return;

        const account =
          status?.account ?? status?.user ?? status?.auth ?? status ?? {};
        const displayName =
          basicProfile?.displayName ??
          account?.displayName ??
          account?.display_name ??
          account?.name ??
          account?.userName ??
          account?.username ??
          status?.displayName ??
          status?.userName ??
          "Conta Epic";

        const avatarUrl =
          account?.avatarUrl ??
          account?.avatar_url ??
          account?.avatar ??
          status?.avatarUrl ??
          status?.avatar ??
          undefined;

        setProfile({ displayName, avatarUrl });
        setTotalGames(library?.total ?? null);
        setInstalledGames(status?.games_installed ?? null);

        if (wishlistResult.status === "fulfilled") {
          const wishlistResponse = wishlistResult.value;
          const wishlistElements = Array.isArray(wishlistResponse)
            ? wishlistResponse
            : wishlistResponse?.data?.Wishlist?.wishlistItems?.elements ??
              wishlistResponse?.data?.Wishlist?.wishlistItems?.elements?.elements ??
              wishlistResponse?.Wishlist?.wishlistItems?.elements ??
              [];
          setWishlistItems(Array.isArray(wishlistElements) ? wishlistElements : []);
          setWishlistError(null);
        } else {
          console.warn("Erro ao carregar wishlist:", wishlistResult.reason);
          setWishlistItems([]);
          setWishlistError(getGraphqlFriendlyError(wishlistResult.reason));
        }
        setWishlistLoading(false);

        if (friendsResult.status === "fulfilled") {
          const friendsList = Array.isArray(friendsResult.value)
            ? friendsResult.value
            : [];
          setFriends(friendsList);
          setFriendsError(null);
        } else {
          console.warn("Erro ao carregar amigos:", friendsResult.reason);
          setFriends([]);
          setFriendsError(getGraphqlFriendlyError(friendsResult.reason));
        }
        setFriendsLoading(false);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        if (!cancelled) {
          setErrorMessage("Falha ao carregar dados do perfil.");
          setProfile({ displayName: "Conta Epic" });
          setTotalGames(null);
          setInstalledGames(null);
          setWishlistItems([]);
          setFriends([]);
          setWishlistLoading(false);
          setFriendsLoading(false);
          setWishlistError("Falha ao carregar wishlist.");
          setFriendsError("Falha ao carregar amigos.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const initials = useMemo(() => {
    const name = profile?.displayName ?? "";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 0) return "EP";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [profile?.displayName]);

  const wishlistCards = useMemo(() => {
    return wishlistItems
      .map((item) => {
        const offer = item?.offer ?? item?.elements?.offer ?? null;
        const offerId = typeof item?.offerId === "string" ? item.offerId : undefined;
        const title =
          offer?.title ??
          offer?.name ??
          item?.offer?.title ??
          offerId ??
          "Item";
        const images = offer?.keyImages ?? item?.offer?.keyImages ?? [];
        const image =
          images.find((img: any) => img.type?.includes("Wide"))?.url ??
          images.find((img: any) => img.type?.includes("Diesel"))?.url ??
          images[0]?.url ??
          "/placeholder.png";
        return { title, image };
      })
      .filter((card) => Boolean(card.title));
  }, [wishlistItems]);

  const friendsList = useMemo(() => {
    return friends.map((friend) => ({
      id: friend?.accountId ?? friend?.id ?? friend?.account_id ?? String(friend?.accountId ?? ""),
      name:
        friend?.displayName ??
        friend?.display_name ??
        friend?.name ??
        friend?.alias ??
        friend?.accountId ??
        "Amigo",
      status: friend?.status ?? friend?.presence ?? friend?.connection ?? undefined,
    }));
  }, [friends]);

  if (loading) {
    return <p>Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Perfil</h1>

      {errorMessage && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div className="rounded bg-gray-800/60 p-4">
          <div className="flex items-center gap-4">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-700 text-xl font-semibold text-gray-100">
                {initials}
              </div>
            )}

            <div>
              <p className="text-sm text-gray-400">Nome do perfil</p>
              <p className="text-xl font-semibold text-gray-100">
                {profile?.displayName ?? "Conta Epic"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded bg-gray-800/60 p-4">
            <p className="text-sm text-gray-400">Total de jogos</p>
            <p className="text-3xl font-bold text-gray-100">
              {totalGames ?? "--"}
            </p>
          </div>

          <div className="rounded bg-gray-800/60 p-4">
            <p className="text-sm text-gray-400">Jogos instalados</p>
            <p className="text-3xl font-bold text-gray-100">
              {installedGames ?? "--"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded bg-gray-800/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Wishlist</h2>
            <span className="text-sm text-gray-400">
              {wishlistCards.length}
            </span>
          </div>
          {wishlistLoading && <p className="text-sm text-gray-400">Carregando...</p>}
          {!wishlistLoading && wishlistError && (
            <p className="text-sm text-red-200">{wishlistError}</p>
          )}
          {!wishlistLoading && !wishlistError && wishlistCards.length === 0 && (
            <p className="text-sm text-gray-400">Nenhum item encontrado.</p>
          )}
          {!wishlistLoading && wishlistCards.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {wishlistCards.map((card, index) => (
                <div
                  key={`${card.title}-${index}`}
                  className="overflow-hidden rounded bg-gray-900/50"
                >
                  <img
                    src={card.image}
                    alt={card.title}
                    className="h-28 w-full object-cover"
                  />
                  <div className="p-2 text-sm text-gray-200">
                    {card.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded bg-gray-800/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Amigos</h2>
            <span className="text-sm text-gray-400">
              {friendsList.length}
            </span>
          </div>
          {friendsLoading && <p className="text-sm text-gray-400">Carregando...</p>}
          {!friendsLoading && friendsError && (
            <p className="text-sm text-red-200">{friendsError}</p>
          )}
          {!friendsLoading && !friendsError && friendsList.length === 0 && (
            <p className="text-sm text-gray-400">Nenhum amigo encontrado.</p>
          )}
          {!friendsLoading && friendsList.length > 0 && (
            <div className="space-y-2">
              {friendsList.map((friend, index) => (
                <div
                  key={`${friend.id || friend.name}-${index}`}
                  className="flex items-center justify-between rounded bg-gray-900/50 px-3 py-2 text-sm"
                >
                  <span className="text-gray-100">{friend.name}</span>
                  {friend.status && (
                    <span className="text-xs text-gray-400">
                      {String(friend.status)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
