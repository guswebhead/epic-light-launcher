use crate::legendary;

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
pub fn legendary_get_game(app_name: String) -> Result<String, String> {
    legendary::get_game_by_app_name(app_name)
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
