use crate::legendary;
use crate::epic_graphql;
use crate::epic_store;
use crate::local_auth;
use crate::secure_store;

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

#[tauri::command]
pub fn local_auth_register(username: String, password: String) -> Result<local_auth::AuthUser, String> {
    local_auth::register(username, password)
}

#[tauri::command]
pub fn local_auth_login(username: String, password: String) -> Result<local_auth::AuthUser, String> {
    local_auth::login(username, password)
}

#[tauri::command]
pub fn local_auth_logout() -> Result<(), String> {
    local_auth::logout()
}

#[tauri::command]
pub fn local_auth_current_user() -> Result<Option<local_auth::AuthUser>, String> {
    local_auth::current_user()
}

#[tauri::command]
pub fn local_user_game_data_upsert(
    app_name: String,
    custom_tags: Vec<String>,
    notes: String,
    playtime_minutes: i64,
    rating: Option<i64>,
) -> Result<local_auth::UserGameData, String> {
    local_auth::upsert_game_data(app_name, custom_tags, notes, playtime_minutes, rating)
}

#[tauri::command]
pub fn local_user_game_data_get(app_name: String) -> Result<Option<local_auth::UserGameData>, String> {
    local_auth::get_game_data(app_name)
}

#[tauri::command]
pub fn local_user_game_data_list() -> Result<Vec<local_auth::UserGameData>, String> {
    local_auth::list_game_data()
}

#[tauri::command]
pub fn secure_store_set_supabase_session(session_json: String) -> Result<(), String> {
    secure_store::set_supabase_session(session_json)
}

#[tauri::command]
pub fn secure_store_get_supabase_session() -> Result<Option<String>, String> {
    secure_store::get_supabase_session()
}

#[tauri::command]
pub fn secure_store_clear_supabase_session() -> Result<(), String> {
    secure_store::clear_supabase_session()
}
