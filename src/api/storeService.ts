import { invoke } from "@tauri-apps/api/core";

type StoreSearchResponse = {
  elements: any[];
  paging?: {
    count?: number;
    total?: number;
  };
  total?: number;
};

const inflightRequests = new Map<string, Promise<any>>();

function dedupeRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, promise);
  return promise;
}

function parseStoreResponse(raw: unknown): StoreSearchResponse {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const search = (parsed as any)?.data?.Catalog?.searchStore;
  if (search?.elements) {
    return search;
  }
  if ((parsed as any)?.elements) {
    return parsed as StoreSearchResponse;
  }
  return { elements: [], paging: { count: 0, total: 0 } };
}

function filterCurrentFreeGames(elements: any[]) {
  const filtered = elements.filter((game) => {
    const promos = game?.promotions?.promotionalOffers ?? [];
    return promos.some(
      (promo: any) =>
        Array.isArray(promo?.promotionalOffers) &&
        promo.promotionalOffers.length > 0
    );
  });
  return filtered.length > 0 ? filtered : elements;
}

export async function fetchHighlights(
  country = "BR",
  locale = "pt-BR"
): Promise<any[]> {
  return dedupeRequest(`store_free_games:${country}:${locale}`, async () => {
    const data = await invoke<string>("epic_store_free_games", {
      country,
      locale,
    });
    const elements = parseStoreResponse(data).elements ?? [];
    return filterCurrentFreeGames(elements);
  });
}

export async function fetchPromotions(
  country = "BR",
  locale = "pt-BR",
  count = 40
): Promise<any[]> {
  return dedupeRequest(
    `store_promotions:${country}:${locale}:${count}`,
    async () => {
      const data = await invoke<string>("epic_store_promotions", {
        country,
        locale,
        count,
      });
      return parseStoreResponse(data).elements ?? [];
    }
  );
}
