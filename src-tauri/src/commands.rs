use crate::legendary;
use crate::epic_graphql;
use crate::epic_store;

#[tauri::command]
pub fn legendary_list_games() -> Result<String, String> {
    legendary::list_games()
}

#[tauri::command]
pub fn legendary_list_installed() -> Result<String, String> {
    legendary::list_installed()
}

#[tauri::command]
pub fn legendary_list_games_paginated(page: usize, page_size: Option<usize>) -> Result<String, String> {
    legendary::list_games_paginated(page, page_size)
}

#[tauri::command]
pub fn legendary_list_installed_paginated(page: usize, page_size: Option<usize>) -> Result<String, String> {
    legendary::list_installed_paginated(page, page_size)
}

#[tauri::command]
pub fn legendary_search_games_paginated(query: String, page: usize, page_size: Option<usize>) -> Result<String, String> {
    legendary::search_games_paginated(query, page, page_size)
}

#[tauri::command]
pub fn legendary_get_game(app_name: String) -> Result<String, String> {
    legendary::get_game_by_app_name(app_name)
}

#[tauri::command]
pub fn legendary_status() -> Result<String, String> {
    legendary::get_status()
}

#[tauri::command]
pub fn legendary_auth() -> Result<String, String> {
    legendary::auth_relogin()
}

#[tauri::command]
pub fn legendary_clear_cache() -> Result<(), String> {
    legendary::clear_cache();
    Ok(())
}

#[tauri::command]
pub async fn epic_graphql_query(query: String, variables: Option<serde_json::Value>) -> Result<String, String> {
    epic_graphql::graphql_raw(query, variables).await
}

#[tauri::command]
pub async fn epic_graphql_wishlist(country: Option<String>, locale: Option<String>) -> Result<String, String> {
    epic_graphql::wishlist(country, locale).await
}

#[tauri::command]
pub async fn epic_graphql_friends() -> Result<String, String> {
    epic_graphql::friends().await
}

#[tauri::command]
pub fn epic_graphql_profile_basic() -> Result<String, String> {
    epic_graphql::profile_basic()
}

#[tauri::command]
pub async fn epic_store_search(
    keywords: Option<String>,
    start: Option<i64>,
    count: Option<i64>,
    sort_by: Option<String>,
    sort_dir: Option<String>,
    country: Option<String>,
    locale: Option<String>,
) -> Result<String, String> {
    epic_store::store_search(
        keywords,
        start,
        count,
        sort_by,
        sort_dir,
        country,
        locale,
    )
    .await
}

#[tauri::command]
pub async fn epic_store_promotions(
    country: Option<String>,
    locale: Option<String>,
    count: Option<i64>,
) -> Result<String, String> {
    epic_store::store_promotions(country, locale, count).await
}

#[tauri::command]
pub async fn epic_store_free_games(
    country: Option<String>,
    locale: Option<String>,
) -> Result<String, String> {
    epic_store::store_free_games(country, locale).await
}

#[tauri::command]
pub fn epic_store_cookie_path() -> Result<String, String> {
    let path = epic_store::store_cookie_path();
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn epic_store_set_cookie(cookie: String) -> Result<(), String> {
    epic_store::write_store_cookie(cookie)
}

#[tauri::command]
pub fn epic_store_clear_cookie() -> Result<(), String> {
    epic_store::clear_store_cookie()
}

#[tauri::command]
pub fn epic_store_cookie_status() -> Result<bool, String> {
    epic_store::store_cookie_status()
}

#[tauri::command]
pub fn epic_store_user_agent_path() -> Result<String, String> {
    let path = epic_store::store_user_agent_path();
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn epic_store_set_user_agent(user_agent: String) -> Result<(), String> {
    epic_store::write_store_user_agent(user_agent)
}

#[tauri::command]
pub fn epic_store_clear_user_agent() -> Result<(), String> {
    epic_store::clear_store_user_agent()
}

#[tauri::command]
pub fn epic_store_user_agent_status() -> Result<bool, String> {
    epic_store::store_user_agent_status()
}
