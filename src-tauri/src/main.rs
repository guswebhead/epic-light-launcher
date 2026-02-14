#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod epic_graphql;
mod epic_store;
mod legendary;
mod cache;
mod local_auth;
mod secure_store;

use commands::{
    epic_graphql_friends, epic_graphql_profile_basic, epic_graphql_query, epic_graphql_wishlist,
    epic_store_clear_cookie, epic_store_clear_user_agent, epic_store_cookie_path,
    epic_store_cookie_status, epic_store_free_games, epic_store_promotions, epic_store_search,
    epic_store_set_cookie, epic_store_set_user_agent, epic_store_user_agent_path,
    epic_store_user_agent_status, legendary_auth, legendary_clear_cache, legendary_get_game,
    legendary_list_games, legendary_list_games_paginated, legendary_list_installed,
    legendary_list_installed_paginated, legendary_search_games_paginated, legendary_status,
    local_auth_current_user, local_auth_login, local_auth_logout, local_auth_register,
    local_user_game_data_get, local_user_game_data_list, local_user_game_data_upsert,
    secure_store_clear_supabase_session, secure_store_get_supabase_session,
    secure_store_set_supabase_session,
};

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
            epic_store_user_agent_status,
            local_auth_register,
            local_auth_login,
            local_auth_logout,
            local_auth_current_user,
            local_user_game_data_upsert,
            local_user_game_data_get,
            local_user_game_data_list,
            secure_store_set_supabase_session,
            secure_store_get_supabase_session,
            secure_store_clear_supabase_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
