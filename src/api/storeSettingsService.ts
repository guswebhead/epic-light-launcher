import { invoke } from "@tauri-apps/api/core";

export async function getStoreCookiePath(): Promise<string> {
  return invoke<string>("epic_store_cookie_path");
}

export async function getStoreCookieStatus(): Promise<boolean> {
  return invoke<boolean>("epic_store_cookie_status");
}

export async function setStoreCookie(cookie: string): Promise<void> {
  await invoke("epic_store_set_cookie", { cookie });
}

export async function clearStoreCookie(): Promise<void> {
  await invoke("epic_store_clear_cookie");
}

export async function getStoreUserAgentPath(): Promise<string> {
  return invoke<string>("epic_store_user_agent_path");
}

export async function getStoreUserAgentStatus(): Promise<boolean> {
  return invoke<boolean>("epic_store_user_agent_status");
}

export async function setStoreUserAgent(userAgent: string): Promise<void> {
  await invoke("epic_store_set_user_agent", { userAgent });
}

export async function clearStoreUserAgent(): Promise<void> {
  await invoke("epic_store_clear_user_agent");
}
