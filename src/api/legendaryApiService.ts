import { invoke } from "@tauri-apps/api/core";

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
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
  const data = await invoke<string>("legendary_list_games");
  return JSON.parse(data);
}

export async function getInstalledEpicGames() {
  const data = await invoke<string>("legendary_list_installed");
  return JSON.parse(data);
}

export async function getEpicLibraryPaginated(
  page: number,
  pageSize?: number
): Promise<PaginatedResponse<any>> {
  const data = await invoke("legendary_list_games_paginated", {
    page,
    page_size: pageSize,
    pageSize,
  });
  return parsePaginatedResponse(data, pageSize ?? 38);
}

export async function searchEpicLibraryPaginated(
  query: string,
  page: number,
  pageSize?: number
): Promise<PaginatedResponse<any>> {
  const data = await invoke("legendary_search_games_paginated", {
    query,
    page,
    page_size: pageSize,
    pageSize,
  });
  return parsePaginatedResponse(data, pageSize ?? 38);
}

export async function clearLegendaryCache(): Promise<void> {
  await invoke("legendary_clear_cache");
}

export async function reauthLegendary(): Promise<string> {
  const data = await invoke<string>("legendary_auth");
  return data ?? "";
}

export async function getEpicGameDetails(appName: string): Promise<any> {
  const data = await invoke<string>("legendary_get_game", {
    app_name: appName,
  });
  return typeof data === "string" ? JSON.parse(data) : data;
}
