import { invoke } from "@tauri-apps/api/core";

type StoreSearchResponse = {
  elements: any[];
  paging?: {
    count?: number;
    total?: number;
  };
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

export type StoreSearchOptions = {
  keywords?: string;
  start?: number;
  count?: number;
  sortBy?: string;
  sortDir?: string;
  country?: string;
  locale?: string;
};

export async function searchStoreGames(
  options: StoreSearchOptions = {}
): Promise<StoreSearchResponse> {
  const {
    keywords,
    start = 0,
    count = 40,
    sortBy = "relevancy",
    sortDir = "DESC",
    country = "BR",
    locale = "pt-BR",
  } = options;

  const key = `store_search:${keywords ?? ""}:${start}:${count}:${sortBy}:${sortDir}:${country}:${locale}`;

  return dedupeRequest(key, async () => {
    const data = await invoke<string>("epic_store_search", {
      keywords,
      start,
      count,
      sort_by: sortBy,
      sort_dir: sortDir,
      country,
      locale,
    });
    return parseStoreResponse(data);
  });
}

export async function fetchAllGames(start = 0, count = 40) {
  try {
    const data = await searchStoreGames({
      start,
      count,
      sortBy: "releaseDate",
      sortDir: "DESC",
    });
    return data.elements ?? [];
  } catch {
    const fallback = await searchStoreGames({
      start,
      count,
      sortBy: "relevancy",
      sortDir: "DESC",
    });
    return fallback.elements ?? [];
  }
}
