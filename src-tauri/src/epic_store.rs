use reqwest::header::{
    HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, CONTENT_TYPE, COOKIE, ORIGIN, REFERER,
    USER_AGENT,
};
use reqwest::Client;
use serde_json::{json, Value};
use std::collections::hash_map::DefaultHasher;
use std::env;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;

use crate::cache;

const STORE_GRAPHQL_ENDPOINT: &str = "https://store.epicgames.com/graphql";
const FREE_GAMES_ENDPOINT: &str =
    "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions";

const DEFAULT_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) EpicGamesLauncher/15.17.1-28790881+++Portal+Release-Live UnrealEngine/4.27.0-28790881+++Portal+Release-Live Chrome/84.0.4147.38 Safari/537.36";
const DEFAULT_ACCEPT_LANGUAGE: &str = "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7";
const DEFAULT_ORIGIN: &str = "https://store.epicgames.com";
const DEFAULT_REFERER: &str = "https://store.epicgames.com/";
const DEFAULT_ACCEPT: &str = "application/json";

const DEFAULT_COUNTRY: &str = "BR";
const DEFAULT_LOCALE: &str = "pt-BR";
const STORE_COOKIE_ENV: &str = "EPIC_STORE_COOKIE";
const STORE_COOKIE_FILE_ENV: &str = "EPIC_STORE_COOKIE_FILE";
const STORE_COOKIE_FILE: &str = "store_cookie.txt";
const STORE_UA_FILE: &str = "store_user_agent.txt";

const STORE_SEARCH_QUERY: &str = r#"
query StoreSearch(
  $keywords: String,
  $count: Int,
  $start: Int,
  $sortBy: String,
  $sortDir: String,
  $country: String!,
  $locale: String!
) {
  Catalog {
    searchStore(
      keywords: $keywords,
      count: $count,
      start: $start,
      sortBy: $sortBy,
      sortDir: $sortDir,
      country: $country,
      locale: $locale,
      withPrice: true
    ) {
      elements {
        id
        title
        productSlug
        namespace
        offerType
        keyImages {
          type
          url
        }
        price(country: $country) {
          totalPrice {
            discountPrice
            originalPrice
            discountPercentage
            currencyCode
          }
        }
        promotions {
          promotionalOffers {
            promotionalOffers {
              startDate
              endDate
              discountSetting {
                discountPercentage
              }
            }
          }
          upcomingPromotionalOffers {
            promotionalOffers {
              startDate
              endDate
              discountSetting {
                discountPercentage
              }
            }
          }
        }
        releaseDate
      }
      paging {
        count
        total
      }
    }
  }
}
"#;

pub async fn store_search(
    keywords: Option<String>,
    start: Option<i64>,
    count: Option<i64>,
    sort_by: Option<String>,
    sort_dir: Option<String>,
    country: Option<String>,
    locale: Option<String>,
) -> Result<String, String> {
    let raw_key = format!(
        "keywords={:?}|start={:?}|count={:?}|sort_by={:?}|sort_dir={:?}|country={:?}|locale={:?}",
        keywords, start, count, sort_by, sort_dir, country, locale
    );
    let cache_key = format!("store_search_{}", hash_key(&raw_key));
    if let Some(cached) = cache::get(&cache_key) {
        return Ok(cached);
    }

    let search = store_search_value(
        keywords,
        start,
        count,
        sort_by,
        sort_dir,
        country,
        locale,
    )
    .await?;
    let json = serde_json::to_string(&search)
        .map_err(|e| format!("Falha ao serializar resposta da store: {}", e))?;
    cache::set(cache_key, json.clone());
    Ok(json)
}

pub async fn store_promotions(
    country: Option<String>,
    locale: Option<String>,
    count: Option<i64>,
) -> Result<String, String> {
    let raw_key = format!(
        "country={:?}|locale={:?}|count={:?}",
        country, locale, count
    );
    let cache_key = format!("store_promotions_{}", hash_key(&raw_key));
    if let Some(cached) = cache::get(&cache_key) {
        return Ok(cached);
    }

    let desired = count.unwrap_or(40).max(1);
    let fetch_count = std::cmp::max(desired * 4, 60);

    let search = match store_search_value(
        None,
        Some(0),
        Some(fetch_count),
        Some("effectiveDate".to_string()),
        Some("DESC".to_string()),
        country.clone(),
        locale.clone(),
    )
    .await
    {
        Ok(value) => value,
        Err(_) => {
            store_search_value(
                None,
                Some(0),
                Some(fetch_count),
                None,
                Some("DESC".to_string()),
                country.clone(),
                locale.clone(),
            )
            .await?
        }
    };

    let mut elements = search
        .get("elements")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    elements.retain(|item| {
        let discount = item
            .get("price")
            .and_then(|value| value.get("totalPrice"))
            .and_then(|value| value.get("discountPercentage"))
            .and_then(Value::as_i64)
            .unwrap_or(0);
        discount > 0
    });

    if elements.len() > desired as usize {
        elements.truncate(desired as usize);
    }

    let total = elements.len();
    let response = json!({
        "elements": elements,
        "total": total
    });
    let json = serde_json::to_string(&response)
        .map_err(|e| format!("Falha ao serializar promocoes: {}", e))?;
    cache::set(cache_key, json.clone());
    Ok(json)
}

pub async fn store_free_games(
    country: Option<String>,
    locale: Option<String>,
) -> Result<String, String> {
    let raw_key = format!("country={:?}|locale={:?}", country, locale);
    let cache_key = format!("store_free_games_{}", hash_key(&raw_key));
    if let Some(cached) = cache::get(&cache_key) {
        return Ok(cached);
    }

    let country = normalize_country(country);
    let locale = normalize_locale(locale);

    let url = format!(
        "{}?locale={}&country={}&allowCountries={}",
        FREE_GAMES_ENDPOINT, locale, country, country
    );

    let client = build_http_client()?;
    let response = client
        .get(url)
        .headers(build_store_headers()?)
        .send()
        .await
        .map_err(|e| format!("Falha ao chamar freebies: {}", e))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("Falha ao ler freebies: {}", e))?;

    if !status.is_success() {
        return Err(format!(
            "Store freebies respondeu {}: {}",
            status.as_u16(),
            truncate_for_error(&text, 220)
        ));
    }

    let value: Value =
        serde_json::from_str(&text).map_err(|e| format!("Falha ao parsear freebies: {}", e))?;
    let search = value
        .get("data")
        .and_then(|v| v.get("Catalog"))
        .and_then(|v| v.get("searchStore"))
        .cloned()
        .unwrap_or(value);

    let json = serde_json::to_string(&search)
        .map_err(|e| format!("Falha ao serializar freebies: {}", e))?;
    cache::set(cache_key, json.clone());
    Ok(json)
}

async fn store_search_value(
    keywords: Option<String>,
    start: Option<i64>,
    count: Option<i64>,
    sort_by: Option<String>,
    sort_dir: Option<String>,
    country: Option<String>,
    locale: Option<String>,
) -> Result<Value, String> {
    let country = normalize_country(country);
    let locale = normalize_locale(locale);
    let keywords = keywords.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });

    let variables = json!({
        "keywords": keywords,
        "count": count.unwrap_or(40),
        "start": start.unwrap_or(0),
        "sortBy": sort_by.unwrap_or_else(|| "relevancy".to_string()),
        "sortDir": sort_dir.unwrap_or_else(|| "DESC".to_string()),
        "country": country,
        "locale": locale
    });

    let data = post_graphql(STORE_SEARCH_QUERY, variables).await?;
    Ok(data
        .get("data")
        .and_then(|value| value.get("Catalog"))
        .and_then(|value| value.get("searchStore"))
        .cloned()
        .unwrap_or_else(|| json!({ "elements": [], "paging": { "count": 0, "total": 0 } })))
}

async fn post_graphql(query: &str, variables: Value) -> Result<Value, String> {
    let client = build_http_client()?;
    let response = client
        .post(STORE_GRAPHQL_ENDPOINT)
        .headers(build_store_headers()?)
        .json(&json!({
            "query": query,
            "variables": variables
        }))
        .send()
        .await
        .map_err(|e| format!("Falha ao chamar Store GraphQL: {}", e))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("Falha ao ler resposta Store: {}", e))?;

    if !status.is_success() {
        if status.as_u16() == 403 && is_cloudflare_block(&text) {
            return Err(store_cookie_hint());
        }
        return Err(format!(
            "Store GraphQL respondeu {}: {}",
            status.as_u16(),
            truncate_for_error(&text, 220)
        ));
    }

    parse_graphql_response(text)
}

fn parse_graphql_response(text: String) -> Result<Value, String> {
    let value: Value =
        serde_json::from_str(&text).map_err(|e| format!("Falha ao parsear GraphQL: {}", e))?;

    if value.get("errors").is_some() {
        return Err(format!("Store GraphQL retornou erro: {}", value));
    }

    Ok(value)
}

fn build_http_client() -> Result<Client, String> {
    let mut client_builder = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .cookie_store(true)
        .gzip(true)
        .deflate(true)
        .brotli(true);

    let proxy_url = env::var("EPIC_STORE_PROXY")
        .ok()
        .filter(|value| !value.is_empty())
        .or_else(|| env::var("EPIC_GRAPHQL_PROXY").ok().filter(|value| !value.is_empty()));

    if let Some(proxy_url) = proxy_url {
        if let Ok(proxy) = reqwest::Proxy::all(&proxy_url) {
            client_builder = client_builder.proxy(proxy);
        }
    }

    client_builder
        .build()
        .map_err(|e| format!("Falha ao criar cliente HTTP: {}", e))
}

fn build_store_headers() -> Result<HeaderMap, String> {
    let user_agent = load_store_user_agent()
        .or_else(|| env::var("EPIC_USER_AGENT").ok())
        .unwrap_or_else(|| DEFAULT_USER_AGENT.to_string());
    let accept_language =
        env::var("EPIC_ACCEPT_LANGUAGE").unwrap_or_else(|_| DEFAULT_ACCEPT_LANGUAGE.to_string());
    let origin = env::var("EPIC_ORIGIN").unwrap_or_else(|_| DEFAULT_ORIGIN.to_string());
    let referer = env::var("EPIC_REFERER").unwrap_or_else(|_| DEFAULT_REFERER.to_string());
    let accept = env::var("EPIC_ACCEPT").unwrap_or_else(|_| DEFAULT_ACCEPT.to_string());

    let mut headers = HeaderMap::new();
    headers.insert(
        USER_AGENT,
        HeaderValue::from_str(user_agent.as_str())
            .map_err(|e| format!("User-Agent invalido: {}", e))?,
    );
    headers.insert(
        ACCEPT,
        HeaderValue::from_str(accept.as_str()).map_err(|e| format!("Accept invalido: {}", e))?,
    );
    headers.insert(
        ACCEPT_LANGUAGE,
        HeaderValue::from_str(accept_language.as_str())
            .map_err(|e| format!("Accept-Language invalido: {}", e))?,
    );
    headers.insert(
        ORIGIN,
        HeaderValue::from_str(origin.as_str()).map_err(|e| format!("Origin invalido: {}", e))?,
    );
    headers.insert(
        REFERER,
        HeaderValue::from_str(referer.as_str()).map_err(|e| format!("Referer invalido: {}", e))?,
    );
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    headers.insert("accept-encoding", HeaderValue::from_static("gzip, deflate, br"));
    headers.insert("cache-control", HeaderValue::from_static("no-cache"));
    headers.insert("pragma", HeaderValue::from_static("no-cache"));
    headers.insert("sec-ch-ua", HeaderValue::from_static("\"Chromium\";v=\"121\", \"Not A(Brand\";v=\"24\""));
    headers.insert("sec-ch-ua-mobile", HeaderValue::from_static("?0"));
    headers.insert("sec-ch-ua-platform", HeaderValue::from_static("\"Windows\""));
    headers.insert("sec-fetch-dest", HeaderValue::from_static("empty"));
    headers.insert("sec-fetch-mode", HeaderValue::from_static("cors"));
    headers.insert("sec-fetch-site", HeaderValue::from_static("same-origin"));
    headers.insert("upgrade-insecure-requests", HeaderValue::from_static("1"));
    headers.insert("dnt", HeaderValue::from_static("1"));

    if let Some(cookie) = load_store_cookie() {
        if is_store_debug_enabled() {
            let has_clearance = cookie.contains("cf_clearance=");
            let has_bm = cookie.contains("__cf_bm=");
            eprintln!(
                "[epic_store] cookie carregado (len={} cf_clearance={} __cf_bm={})",
                cookie.len(),
                has_clearance,
                has_bm
            );
        }
        if let Ok(value) = HeaderValue::from_str(cookie.as_str()) {
            headers.insert(COOKIE, value);
        }
    }

    Ok(headers)
}

fn normalize_country(country: Option<String>) -> String {
    country
        .and_then(|value| {
            let trimmed = value.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        })
        .unwrap_or_else(|| DEFAULT_COUNTRY.to_string())
}

fn normalize_locale(locale: Option<String>) -> String {
    locale
        .and_then(|value| {
            let trimmed = value.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        })
        .unwrap_or_else(|| DEFAULT_LOCALE.to_string())
}

fn hash_key(raw: &str) -> String {
    let mut hasher = DefaultHasher::new();
    raw.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

fn truncate_for_error(value: &str, max_len: usize) -> String {
    if value.len() <= max_len {
        return value.to_string();
    }
    let mut truncated = value.chars().take(max_len).collect::<String>();
    truncated.push_str("...");
    truncated
}

fn normalize_cookie(value: &str) -> String {
    let mut trimmed = value.trim().to_string();
    let lower = trimmed.to_lowercase();
    if lower.starts_with("cookie:") {
        trimmed = trimmed[7..].trim().to_string();
    }
    trimmed
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}

fn is_store_debug_enabled() -> bool {
    env::var("EPIC_STORE_DEBUG")
        .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

fn load_store_cookie() -> Option<String> {
    if let Ok(cookie) = env::var(STORE_COOKIE_ENV) {
        let trimmed = normalize_cookie(cookie.as_str());
        if !trimmed.is_empty() {
            return Some(trimmed);
        }
    }

    if let Ok(path) = env::var(STORE_COOKIE_FILE_ENV) {
        let trimmed = path.trim().to_string();
        if !trimmed.is_empty() {
            if let Ok(content) = fs::read_to_string(trimmed) {
                let value = normalize_cookie(content.as_str());
                if !value.is_empty() {
                    return Some(value);
                }
            }
        }
    }

    let path = store_cookie_path();
    if let Ok(content) = fs::read_to_string(path) {
        let value = normalize_cookie(content.as_str());
        if !value.is_empty() {
            return Some(value);
        }
    }

    None
}

fn load_store_user_agent() -> Option<String> {
    let path = store_user_agent_path();
    if let Ok(content) = fs::read_to_string(path) {
        let value = content.trim().to_string();
        if !value.is_empty() {
            return Some(value);
        }
    }
    None
}

pub fn store_cookie_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(std::env::temp_dir);
    base.join("epic-light-launcher").join(STORE_COOKIE_FILE)
}

fn is_cloudflare_block(body: &str) -> bool {
    let lowered = body.to_lowercase();
    lowered.contains("cf_challenge")
        || lowered.contains("cf-challenge")
        || lowered.contains("cf-bm")
        || lowered.contains("just a moment")
        || lowered.contains("cloudflare")
}

fn store_cookie_hint() -> String {
    "Cloudflare bloqueou o GraphQL da Store. \
Defina o cookie completo (incluindo cf_clearance e __cf_bm) via EPIC_STORE_COOKIE \
ou grave em store_cookie.txt dentro de %AppData%/epic-light-launcher. \
Se continuar bloqueado, configure o User-Agent igual ao do navegador."
        .to_string()
}

pub fn write_store_cookie(cookie: String) -> Result<(), String> {
    let value = normalize_cookie(cookie.as_str());
    if value.is_empty() {
        return Err("Cookie vazio. Cole o header Cookie completo.".to_string());
    }

    let path = store_cookie_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Falha ao criar pasta de cookie: {}", e))?;
    }
    fs::write(path, value)
        .map_err(|e| format!("Falha ao salvar cookie: {}", e))?;
    Ok(())
}

pub fn clear_store_cookie() -> Result<(), String> {
    let path = store_cookie_path();
    if path.exists() {
        fs::remove_file(path)
            .map_err(|e| format!("Falha ao remover cookie: {}", e))?;
    }
    Ok(())
}

pub fn store_cookie_status() -> Result<bool, String> {
    Ok(load_store_cookie().is_some())
}

pub fn store_user_agent_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(std::env::temp_dir);
    base.join("epic-light-launcher").join(STORE_UA_FILE)
}

pub fn write_store_user_agent(value: String) -> Result<(), String> {
    let ua = value.trim();
    if ua.is_empty() {
        return Err("User-Agent vazio. Cole o User-Agent do navegador.".to_string());
    }

    let path = store_user_agent_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Falha ao criar pasta do User-Agent: {}", e))?;
    }
    fs::write(path, ua)
        .map_err(|e| format!("Falha ao salvar User-Agent: {}", e))?;
    Ok(())
}

pub fn clear_store_user_agent() -> Result<(), String> {
    let path = store_user_agent_path();
    if path.exists() {
        fs::remove_file(path)
            .map_err(|e| format!("Falha ao remover User-Agent: {}", e))?;
    }
    Ok(())
}

pub fn store_user_agent_status() -> Result<bool, String> {
    Ok(load_store_user_agent().is_some())
}
