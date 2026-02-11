use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use std::time::Instant;
use serde_json::{json, Value};
use crate::cache;

lazy_static::lazy_static! {
    static ref LEGENDARY_LOCK: Mutex<()> = Mutex::new(());
}

const CACHE_KEY_GAMES: &str = "legendary_games";
const CACHE_KEY_INSTALLED: &str = "legendary_installed";
const CACHE_KEY_STATUS: &str = "legendary_status";
const DEFAULT_PAGE_SIZE: usize = 48;

pub fn list_games() -> Result<String, String> {
    execute_legendary(&["list-games", "--json"])
}

pub fn list_installed() -> Result<String, String> {
    execute_legendary(&["list-installed", "--json"])
}

pub fn list_games_paginated(page: usize, page_size: Option<usize>) -> Result<String, String> {
    let page_size = page_size.unwrap_or(DEFAULT_PAGE_SIZE);
    let all_games = get_cached_or_fetch(CACHE_KEY_GAMES, || execute_legendary(&["list-games", "--json"]))?;
    
    paginate_json(&all_games, page, page_size)
}

pub fn list_installed_paginated(page: usize, page_size: Option<usize>) -> Result<String, String> {
    let page_size = page_size.unwrap_or(DEFAULT_PAGE_SIZE);
    let all_installed = get_cached_or_fetch(CACHE_KEY_INSTALLED, || execute_legendary(&["list-installed", "--json"]))?;
    
    paginate_json(&all_installed, page, page_size)
}

pub fn get_status() -> Result<String, String> {
    get_cached_or_fetch(CACHE_KEY_STATUS, || execute_legendary(&["status", "--json", "--offline"]))
}

pub fn search_games_paginated(query: String, page: usize, page_size: Option<usize>) -> Result<String, String> {
    let page_size = page_size.unwrap_or(DEFAULT_PAGE_SIZE);
    let all_games = get_cached_or_fetch(CACHE_KEY_GAMES, || execute_legendary(&["list-games", "--json"]))?;

    let data: Value = serde_json::from_str(&all_games)
        .map_err(|e| format!("Erro ao fazer parse do JSON: {}", e))?;

    let items = if data.is_array() {
        data.as_array().unwrap().clone()
    } else if data.is_object() && data.get("data").is_some() {
        data.get("data").unwrap().as_array().unwrap().clone()
    } else {
        return Err("Formato JSON invalido".into());
    };

    let trimmed = query.trim().to_lowercase();
    if trimmed.is_empty() {
        return paginate_json(&all_games, page, page_size);
    }

    let filtered: Vec<Value> = items
        .into_iter()
        .filter(|item| {
            let app_name = item.get("app_name").and_then(Value::as_str).unwrap_or("");
            let app_title = item.get("app_title").and_then(Value::as_str).unwrap_or("");
            let title = item
                .get("metadata")
                .and_then(|meta| meta.get("title"))
                .and_then(Value::as_str)
                .unwrap_or("");
            let name = item
                .get("metadata")
                .and_then(|meta| meta.get("name"))
                .and_then(Value::as_str)
                .unwrap_or("");

            let q = trimmed.as_str();
            app_name.to_lowercase().contains(q)
                || app_title.to_lowercase().contains(q)
                || title.to_lowercase().contains(q)
                || name.to_lowercase().contains(q)
        })
        .collect();

    let total = filtered.len();
    if total == 0 {
        let response = json!({
            "items": [],
            "page": 1,
            "page_size": page_size,
            "total": 0,
            "total_pages": 1
        });

        return serde_json::to_string(&response)
            .map_err(|e| format!("Erro ao serializar resposta: {}", e));
    }

    let total_pages = (total + page_size - 1) / page_size;
    if page == 0 || page > total_pages {
        return Err(format!("Pagina {} invalida. Total de paginas: {}", page, total_pages));
    }

    let start = (page - 1) * page_size;
    let end = (start + page_size).min(total);
    let paginated_items: Vec<Value> = filtered[start..end].to_vec();

    let response = json!({
        "items": paginated_items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    });

    serde_json::to_string(&response)
        .map_err(|e| format!("Erro ao serializar resposta: {}", e))
}

pub fn get_game_by_app_name(app_name: String) -> Result<String, String> {
    let all_games = get_cached_or_fetch(CACHE_KEY_GAMES, || execute_legendary(&["list-games", "--json"]))?;

    let data: Value = serde_json::from_str(&all_games)
        .map_err(|e| format!("Erro ao fazer parse do JSON: {}", e))?;

    let items = if data.is_array() {
        data.as_array().unwrap().clone()
    } else if data.is_object() && data.get("data").is_some() {
        data.get("data").unwrap().as_array().unwrap().clone()
    } else {
        return Err("Formato JSON inválido".into());
    };

    let selected = items
        .into_iter()
        .find(|item| item.get("app_name").and_then(Value::as_str) == Some(app_name.as_str()));

    match selected {
        Some(game) => serde_json::to_string(&game)
            .map_err(|e| format!("Erro ao serializar resposta: {}", e)),
        None => Err(format!("Jogo não encontrado: {}", app_name)),
    }
}

pub fn auth_relogin() -> Result<String, String> {
    let _lock = LEGENDARY_LOCK.lock().unwrap();
    let _ = execute_legendary_inner(&["auth", "--delete"]);
    let result = execute_legendary_inner(&["auth"])?;
    clear_cache();
    Ok(result)
}

pub fn clear_cache() {
    cache::clear(CACHE_KEY_GAMES);
    cache::clear(CACHE_KEY_INSTALLED);
    cache::clear(CACHE_KEY_STATUS);
}

fn get_cached_or_fetch<F>(cache_key: &str, fetch_fn: F) -> Result<String, String>
where
    F: FnOnce() -> Result<String, String>,
{
    // Tenta obter do cache
    if let Some(cached_data) = cache::get(cache_key) {
        return Ok(cached_data);
    }
    
    // Se não estiver em cache, faz a chamada
    let data = fetch_fn()?;
    
    // Armazena em cache
    cache::set(cache_key.to_string(), data.clone());
    
    Ok(data)
}

fn paginate_json(json_str: &str, page: usize, page_size: usize) -> Result<String, String> {
    let data: Value = serde_json::from_str(json_str)
        .map_err(|e| format!("Erro ao fazer parse do JSON: {}", e))?;
    
    let items = if data.is_array() {
        data.as_array().unwrap().clone()
    } else if data.is_object() && data.get("data").is_some() {
        data.get("data").unwrap().as_array().unwrap().clone()
    } else {
        return Err("Formato JSON inválido".into());
    };
    
    let total = items.len();
    let total_pages = (total + page_size - 1) / page_size;
    
    if page == 0 || page > total_pages {
        return Err(format!("Página {} inválida. Total de páginas: {}", page, total_pages));
    }
    
    let start = (page - 1) * page_size;
    let end = (start + page_size).min(total);
    
    let paginated_items: Vec<Value> = items[start..end].to_vec();
    
    let response = json!({
        "items": paginated_items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    });
    
    serde_json::to_string(&response)
        .map_err(|e| format!("Erro ao serializar resposta: {}", e))
}

fn get_legendary_path() -> PathBuf {
    #[cfg(debug_assertions)]
    {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("bin/legendary.exe")
    }

    #[cfg(not(debug_assertions))]
    {
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|path| path.parent().map(|p| p.to_path_buf()))
            .unwrap_or_else(|| PathBuf::from("."));
        exe_dir.join("legendary.exe")
    }
}

fn execute_legendary(args: &[&str]) -> Result<String, String> {
    let _lock = LEGENDARY_LOCK.lock().unwrap();
    execute_legendary_inner(args)
}

fn execute_legendary_inner(args: &[&str]) -> Result<String, String> {
    let legendary_path = get_legendary_path();
    let start = Instant::now();

    eprintln!("[legendary] exec {:?} {:?}", legendary_path, args);
    
    let output = Command::new(&legendary_path)
        .args(args)
        .output()
        .map_err(|e| format!("Erro ao executar legendary em {:?}: {}", legendary_path, e))?;

    let duration_ms = start.elapsed().as_millis();

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!(
            "[legendary] erro status={} duracao={}ms stderr={}",
            output.status,
            duration_ms,
            truncate_for_log(&stderr, 600)
        );
        return Err(format!("Legendary retornou erro: {}", stderr));
    }

    let result = String::from_utf8_lossy(&output.stdout).to_string();
    eprintln!(
        "[legendary] ok status={} duracao={}ms",
        output.status,
        duration_ms
    );
    Ok(result)
}

fn truncate_for_log(value: &str, max_len: usize) -> String {
    if value.len() <= max_len {
        return value.to_string();
    }
    let mut truncated = value.chars().take(max_len).collect::<String>();
    truncated.push_str("...");
    truncated
}
