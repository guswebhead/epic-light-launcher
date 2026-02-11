#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod epic_graphql;
mod epic_store;
mod legendary;
mod cache;

use commands::{legendary_list_games, legendary_list_installed, legendary_list_games_paginated, legendary_list_installed_paginated, legendary_clear_cache, legendary_auth, legendary_get_game, legendary_search_games_paginated, legendary_status, epic_graphql_query, epic_graphql_wishlist, epic_graphql_friends, epic_graphql_profile_basic, epic_store_search, epic_store_promotions, epic_store_free_games, epic_store_cookie_path, epic_store_set_cookie, epic_store_clear_cookie, epic_store_cookie_status, epic_store_user_agent_path, epic_store_set_user_agent, epic_store_clear_user_agent, epic_store_user_agent_status};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            legendary_list_games,
            legendary_list_installed,
            legendary_list_games_paginated,
            legendary_list_installed_paginated,
            legendary_search_games_paginated,
            legendary_get_game,
            legendary_status,
            legendary_auth,
            legendary_clear_cache,
            epic_graphql_query,
            epic_graphql_wishlist,
            epic_graphql_friends,
            epic_graphql_profile_basic,
            epic_store_search,
            epic_store_promotions,
            epic_store_free_games,
            epic_store_cookie_path,
            epic_store_set_cookie,
            epic_store_clear_cookie,
            epic_store_cookie_status,
            epic_store_user_agent_path,
            epic_store_set_user_agent,
            epic_store_clear_user_agent,
            epic_store_user_agent_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
