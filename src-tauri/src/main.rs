#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod legendary;
mod cache;

use commands::{legendary_list_games, legendary_list_installed, legendary_list_games_paginated, legendary_list_installed_paginated, legendary_clear_cache, legendary_auth, legendary_get_game, legendary_search_games_paginated};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            legendary_list_games,
            legendary_list_installed,
            legendary_list_games_paginated,
            legendary_list_installed_paginated,
            legendary_search_games_paginated,
            legendary_get_game,
            legendary_auth,
            legendary_clear_cache
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
