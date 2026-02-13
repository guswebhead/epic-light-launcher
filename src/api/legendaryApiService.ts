import { invoke } from "@tauri-apps/api/core";
import type { EpicGame, PaginatedData } from "../types/EpicGame";

// Alias for backwards compatibility
type PaginatedResponse<T> = PaginatedData<T>;

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

type RawPaginatedResponse<T> = Partial<{
  items: T[];
  data: T[];
  page: number;
  current_page: number;
  page_size: number;
  pageSize: number;
  per_page: number;
  total: number;
  total_items: number;
  totalItems: number;
  total_pages: number;
  totalPages: number;
}>;

function parsePaginatedResponse<T>(
  data: unknown,
  fallbackPageSize: number
): PaginatedResponse<T> {
  const raw: RawPaginatedResponse<T> =
    typeof data === "string" ? JSON.parse(data) : (data as RawPaginatedResponse<T>);

  const items = raw.items ?? raw.data ?? [];
  const page = raw.page ?? raw.current_page ?? 1;
  const pageSize =
    raw.page_size ?? raw.pageSize ?? raw.per_page ?? fallbackPageSize;
  const total =
    raw.total ?? raw.total_items ?? raw.totalItems ?? items.length;
  const totalPages =
    raw.total_pages ??
    raw.totalPages ??
    (pageSize > 0 ? Math.ceil(total / pageSize) : 0);

  return {
    items,
    page,
    page_size: pageSize,
    total,
    total_pages: totalPages,
  };
}

export async function getEpicLibrary() {
  return dedupeRequest("legendary_list_games", async () => {
    const data = await invoke<string>("legendary_list_games");
    return JSON.parse(data);
  });
}

export async function getInstalledEpicGames() {
  return dedupeRequest("legendary_list_installed", async () => {
    const data = await invoke<string>("legendary_list_installed");
    return JSON.parse(data);
  });
}

export async function getEpicLibraryPaginated(
  page: number,
  pageSize?: number
): Promise<PaginatedData<EpicGame>> {
  const key = `legendary_list_games_paginated:${page}:${pageSize ?? ""}`;
  return dedupeRequest(key, async () => {
    const data = await invoke("legendary_list_games_paginated", {
      page,
      page_size: pageSize,
      pageSize,
    });
    return parsePaginatedResponse(data, pageSize ?? 38);
  });
}

export async function searchEpicLibraryPaginated(
  query: string,
  page: number,
  pageSize?: number
): Promise<PaginatedData<EpicGame>> {
  const key = `legendary_search_games_paginated:${query}:${page}:${pageSize ?? ""}`;
  return dedupeRequest(key, async () => {
    const data = await invoke("legendary_search_games_paginated", {
      query,
      page,
      page_size: pageSize,
      pageSize,
    });
    return parsePaginatedResponse(data, pageSize ?? 38);
  });
}

export async function clearLegendaryCache(): Promise<void> {
  await invoke("legendary_clear_cache");
}

export async function reauthLegendary(): Promise<string> {
  const data = await invoke<string>("legendary_auth");
  return data ?? "";
}

export async function getEpicGameDetails(appName: string): Promise<EpicGame> {
  const key = `legendary_get_game:${appName}`;
  return dedupeRequest(key, async () => {
    const data = await invoke<string>("legendary_get_game", {
      app_name: appName,
    });
    return typeof data === "string" ? JSON.parse(data) : data;
  });
}

export async function getLegendaryStatus(): Promise<any> {
  return dedupeRequest("legendary_status", async () => {
    const data = await invoke<string>("legendary_status");
    return typeof data === "string" ? JSON.parse(data) : data;
  });
}

export async function epicGraphqlQuery(
  query: string,
  variables?: Record<string, any>
): Promise<any> {
  const key = `epic_graphql_query:${query}:${JSON.stringify(variables ?? {})}`;
  return dedupeRequest(key, async () => {
    const data = await invoke<string>("epic_graphql_query", {
      query,
      variables,
    });
    return typeof data === "string" ? JSON.parse(data) : data;
  });
}

export async function getEpicWishlist(
  country?: string,
  locale?: string
): Promise<any> {
  const key = `epic_graphql_wishlist:${country ?? ""}:${locale ?? ""}`;
  return dedupeRequest(key, async () => {
    const data = await invoke<string>("epic_graphql_wishlist", {
      country,
      locale,
    });
    return typeof data === "string" ? JSON.parse(data) : data;
  });
}

export async function getEpicFriends(): Promise<any> {
  return dedupeRequest("epic_graphql_friends", async () => {
    const data = await invoke<string>("epic_graphql_friends");
    return typeof data === "string" ? JSON.parse(data) : data;
  });
}

export async function getEpicProfileBasic(): Promise<any> {
  return dedupeRequest("epic_graphql_profile_basic", async () => {
    const data = await invoke<string>("epic_graphql_profile_basic");
    return typeof data === "string" ? JSON.parse(data) : data;
  });
}
