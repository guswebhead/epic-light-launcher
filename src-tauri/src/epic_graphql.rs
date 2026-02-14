use chrono::{DateTime, Utc};
use reqwest::header::{
    HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, CONTENT_TYPE, ORIGIN, REFERER, USER_AGENT,
};
use reqwest::Client;
use serde_json::{json, Value};
use std::env;
use std::fs;
use std::path::PathBuf;

const DEFAULT_GRAPHQL_ENDPOINTS: [&str; 2] = [
    "https://launcher-public-service-prod06.ol.epicgames.com/launcher/api/public/graphql",
    "https://store.epicgames.com/graphql",
];
const DEFAULT_ACCOUNT_GRAPHQL_ENDPOINTS: [&str; 1] = [
    "https://store.epicgames.com/graphql",
];
const DEFAULT_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) EpicGamesLauncher/15.17.1-28790881+++Portal+Release-Live UnrealEngine/4.27.0-28790881+++Portal+Release-Live Chrome/84.0.4147.38 Safari/537.36";
const DEFAULT_ACCEPT_LANGUAGE: &str = "en-US,en;q=0.9";
const DEFAULT_ORIGIN: &str = "https://store.epicgames.com";
const DEFAULT_REFERER: &str = "https://store.epicgames.com/";
const DEFAULT_ACCEPT: &str = "application/json";

const FRIENDS_QUERY: &str = r#"
query FriendsQuery($displayNames: Boolean!) {
  Friends {
    summary(displayNames: $displayNames) {
      friends {
        accountId
        displayName
        alias
        favorite
      }
    }
  }
}
"#;

const WISHLIST_QUERY: &str = r#"
query WishlistQuery {
  Wishlist {
    wishlistItems {
      elements {
        id
        namespace
        offerId
        created
      }
    }
  }
}
"#;

struct LegendaryUser {
    access_token: String,
    account_id: Option<String>,
    display_name: Option<String>,
    expires_at: Option<String>,
}

fn legendary_user_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Some(home) = dirs::home_dir() {
        paths.push(home.join(".config").join("legendary").join("user.json"));
    }
    if let Some(config) = dirs::config_dir() {
        paths.push(config.join("legendary").join("user.json"));
    }
    paths
}

fn load_legendary_user() -> Result<LegendaryUser, String> {
    let mut last_error = None;
    for path in legendary_user_paths() {
        if !path.exists() {
            continue;
        }
        match fs::read_to_string(&path) {
            Ok(content) => {
                let value: Value = serde_json::from_str(&content)
                    .map_err(|e| format!("Erro ao ler user.json: {}", e))?;
                let access_token = value
                    .get("access_token")
                    .and_then(Value::as_str)
                    .ok_or("access_token ausente em user.json")?
                    .to_string();
                let account_id = value
                    .get("account_id")
                    .and_then(Value::as_str)
                    .map(|val| val.to_string());
                let display_name = value
                    .get("displayName")
                    .or_else(|| value.get("display_name"))
                    .and_then(Value::as_str)
                    .map(|val| val.to_string());
                let expires_at = value
                    .get("expires_at")
                    .and_then(Value::as_str)
                    .map(|val| val.to_string());
                return Ok(LegendaryUser {
                    access_token,
                    account_id,
                    display_name,
                    expires_at,
                });
            }
            Err(err) => {
                last_error = Some(err);
            }
        }
    }

    if let Some(err) = last_error {
        return Err(format!("Falha ao ler user.json: {}", err));
    }
    Err("user.json do Legendary não encontrado".to_string())
}

pub struct EpicGraphQLClient {
    http: Client,
    user: LegendaryUser,
    endpoints: Vec<String>,
}

impl EpicGraphQLClient {
    pub fn from_legendary() -> Result<Self, String> {
        Self::with_endpoints(graphql_endpoints())
    }

    pub fn from_legendary_account() -> Result<Self, String> {
        Self::with_endpoints(graphql_account_endpoints())
    }

    fn with_endpoints(endpoints: Vec<String>) -> Result<Self, String> {
        let user = load_legendary_user()?;
        if let Some(status) = token_status(&user) {
            if is_debug_enabled() {
                eprintln!("{}", status);
            }
            if status.contains("EXPIRADO") {
                return Err(
                    "Token do Legendary expirado. Reautentique e tente novamente.".to_string(),
                );
            }
        }
        let http = build_http_client()?;
        Ok(Self {
            http,
            user,
            endpoints,
        })
    }

    pub async fn query(&self, query: &str, variables: Value) -> Result<Value, String> {
        let mut errors: Vec<String> = Vec::new();

        for (idx, endpoint) in self.endpoints.iter().enumerate() {
            // Delay maior entre endpoints para parecer humano
            if idx > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(2000)).await;
            }
            
            // Retry com delays maiores
            for retry in 0..4 {
                if retry > 0 {
                    let delay_ms = match retry {
                        1 => 2000,
                        2 => 4000,
                        _ => 6000,
                    };
                    if is_debug_enabled() {
                        eprintln!("[epic_graphql] Endpoint {} - Retry {}/4, aguardando {}ms...", idx + 1, retry, delay_ms);
                    }
                    tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                }
                
                match self.try_post(endpoint, query, &variables).await {
                    Ok(value) => return Ok(value),
                    Err(err) => {
                        errors.push(err);
                        if is_debug_enabled() {
                            eprintln!("[epic_graphql] Endpoint {} - Tentativa {} falhou", idx + 1, retry + 1);
                        }
                        continue;
                    }
                }
            }
        }

        Err(format!(
            "Falha ao chamar GraphQL em todos os endpoints. Erros: {}",
            errors.join(" | ")
        ))
    }

    async fn try_post(
        &self,
        endpoint: &str,
        query: &str,
        variables: &Value,
    ) -> Result<Value, String> {
        if is_debug_enabled() {
            log_request_debug("POST", endpoint, query, variables);
        }
        let response = self
            .http
            .post(endpoint)
            .bearer_auth(&self.user.access_token)
            .headers(build_graphql_headers()?)
            .json(&json!({
                "query": query,
                "variables": variables
            }))
            .send()
            .await;

        let response = match response {
            Ok(resp) => resp,
            Err(err) => {
                let msg = format!("Falha ao chamar GraphQL em {}: {}", endpoint, err);
                if should_try_next_endpoint(&err) {
                    return Err(msg);
                }
                return Err(msg);
            }
        };

        let status = response.status();
        
        // Tentar ler o texto de forma segura, tratando dados comprimidos
        let text = match response.text().await {
            Ok(t) => t,
            Err(e) => {
                return Err(format!("Falha ao ler resposta GraphQL: {}", e));
            }
        };

        if !status.is_success() {
            return Err(summarize_http_error(endpoint, status.as_u16(), &text));
        }

        parse_graphql_response(text)
    }

    #[allow(dead_code)]
    async fn try_get(
        &self,
        endpoint: &str,
        query: &str,
        variables: &Value,
    ) -> Result<Value, String> {
        if is_debug_enabled() {
            log_request_debug("GET", endpoint, query, variables);
        }
        let variables_str = serde_json::to_string(variables)
            .map_err(|e| format!("Falha ao serializar variaveis: {}", e))?;

        let response = self
            .http
            .get(endpoint)
            .bearer_auth(&self.user.access_token)
            .headers(build_graphql_headers()?)
            .query(&[("query", query), ("variables", variables_str.as_str())])
            .send()
            .await
            .map_err(|e| format!("Falha ao chamar GraphQL (GET) em {}: {}", endpoint, e))?;

        let status = response.status();
        let text = response
            .text()
            .await
            .map_err(|e| format!("Falha ao ler resposta GraphQL: {}", e))?;

        if !status.is_success() {
            return Err(summarize_http_error(endpoint, status.as_u16(), &text));
        }

        parse_graphql_response(text)
    }
}

pub async fn graphql_raw(query: String, variables: Option<Value>) -> Result<String, String> {
    let client = EpicGraphQLClient::from_legendary()?;
    let data = client
        .query(&query, variables.unwrap_or_else(|| json!({})))
        .await?;
    serde_json::to_string(&data).map_err(|e| format!("Falha ao serializar: {}", e))
}

pub async fn wishlist(country: Option<String>, locale: Option<String>) -> Result<String, String> {
    let _ = country;
    let _ = locale;
    
    // Tentar carregar do GraphQL
    match EpicGraphQLClient::from_legendary_account() {
        Ok(client) => {
            match client.query(WISHLIST_QUERY, json!({})).await {
                Ok(data) => {
                    let elements = data
                        .get("data")
                        .and_then(|value| value.get("Wishlist"))
                        .and_then(|value| value.get("wishlistItems"))
                        .and_then(|value| value.get("elements"))
                        .cloned()
                        .unwrap_or_else(|| json!([]));
                    serde_json::to_string(&elements).map_err(|e| format!("Falha ao serializar: {}", e))
                }
                Err(err) => {
                    if is_debug_enabled() {
                        eprintln!("[epic_graphql] Wishlist falhou, retornando lista vazia: {}", err);
                    }
                    // Fallback: retornar lista vazia em vez de falhar
                    Ok("[]".to_string())
                }
            }
        }
        Err(err) => {
            if is_debug_enabled() {
                eprintln!("[epic_graphql] Não conseguiu criar cliente para wishlist: {}", err);
            }
            // Fallback: retornar lista vazia
            Ok("[]".to_string())
        }
    }
}

pub async fn friends() -> Result<String, String> {
    // Tentar carregar do GraphQL
    match EpicGraphQLClient::from_legendary_account() {
        Ok(client) => {
            let variables = json!({
                "displayNames": true
            });
            match client.query(FRIENDS_QUERY, variables).await {
                Ok(data) => {
                    let friends = data
                        .get("data")
                        .and_then(|value| value.get("Friends"))
                        .and_then(|value| value.get("summary"))
                        .and_then(|value| value.get("friends"))
                        .cloned()
                        .unwrap_or_else(|| json!([]));
                    serde_json::to_string(&friends).map_err(|e| format!("Falha ao serializar: {}", e))
                }
                Err(err) => {
                    if is_debug_enabled() {
                        eprintln!("[epic_graphql] Friends falhou, retornando lista vazia: {}", err);
                    }
                    // Fallback: retornar lista vazia
                    Ok("[]".to_string())
                }
            }
        }
        Err(err) => {
            if is_debug_enabled() {
                eprintln!("[epic_graphql] Não conseguiu criar cliente para friends: {}", err);
            }
            // Fallback: retornar lista vazia
            Ok("[]".to_string())
        }
    }
}

pub fn profile_basic() -> Result<String, String> {
    let user = load_legendary_user()?;
    let profile = json!({
        "displayName": user.display_name,
        "accountId": user.account_id,
    });
    serde_json::to_string(&profile).map_err(|e| format!("Falha ao serializar: {}", e))
}

fn graphql_endpoints() -> Vec<String> {
    if let Ok(endpoints) = env::var("EPIC_GRAPHQL_ENDPOINTS") {
        let custom: Vec<String> = endpoints
            .split(',')
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .collect();
        if !custom.is_empty() {
            return custom;
        }
    }
    if let Ok(endpoint) = env::var("EPIC_GRAPHQL_ENDPOINT") {
        if !endpoint.trim().is_empty() {
            return vec![endpoint.trim().to_string()];
        }
    }
    DEFAULT_GRAPHQL_ENDPOINTS
        .iter()
        .map(|value| (*value).to_string())
        .collect()
}

fn graphql_account_endpoints() -> Vec<String> {
    if let Ok(endpoints) = env::var("EPIC_ACCOUNT_GRAPHQL_ENDPOINTS") {
        let custom: Vec<String> = endpoints
            .split(',')
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .collect();
        if !custom.is_empty() {
            return custom;
        }
    }
    if let Ok(endpoint) = env::var("EPIC_ACCOUNT_GRAPHQL_ENDPOINT") {
        if !endpoint.trim().is_empty() {
            return vec![endpoint.trim().to_string()];
        }
    }
    DEFAULT_ACCOUNT_GRAPHQL_ENDPOINTS
        .iter()
        .map(|value| (*value).to_string())
        .collect()
}

fn should_try_next_endpoint(err: &reqwest::Error) -> bool {
    if err.is_connect() || err.is_request() {
        let message = err.to_string().to_lowercase();
        return message.contains("dns")
            || message.contains("host")
            || message.contains("lookup")
            || message.contains("resolver")
            || message.contains("name or service not known")
            || message.contains("no such host")
            || message.contains("host nao")
            || message.contains("este host nao e conhecido")
            || message.contains("este host não é conhecido");
    }
    false
}

fn parse_graphql_response(text: String) -> Result<Value, String> {
    let value: Value =
        serde_json::from_str(&text).map_err(|e| format!("Falha ao parsear GraphQL: {}", e))?;

    if value.get("errors").is_some() {
        return Err(format!("GraphQL retornou erro: {}", value));
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

    // Suporte a proxy se configurado
    if let Ok(proxy_url) = env::var("EPIC_GRAPHQL_PROXY") {
        if !proxy_url.is_empty() {
            if let Ok(proxy) = reqwest::Proxy::all(&proxy_url) {
                client_builder = client_builder.proxy(proxy);
                if is_debug_enabled() {
                    eprintln!("[epic_graphql] Usando proxy: {}", proxy_url);
                }
            }
        }
    }

    client_builder
        .build()
        .map_err(|e| format!("Falha ao criar cliente HTTP: {}", e))
}

fn build_graphql_headers() -> Result<HeaderMap, String> {
    let user_agent = env::var("EPIC_USER_AGENT").unwrap_or_else(|_| DEFAULT_USER_AGENT.to_string());
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
    
    // Headers adicionais para contornar Cloudflare - parecer um navegador real
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
    
    Ok(headers)
}

fn summarize_http_error(endpoint: &str, status: u16, body: &str) -> String {
    // Checar se é dados binários/comprimidos (caracteres não-printáveis)
    let is_binary = body.chars().filter(|c| c.is_control() && *c != '\n' && *c != '\r' && *c != '\t').count() > body.len() / 4;
    
    if is_binary {
        return format!(
            "GraphQL retornou {} em {} (possível resposta comprimida não processada)",
            status, endpoint
        );
    }
    
    let body_lower = body.to_lowercase();
    if status == 403 && (body_lower.contains("just a moment") || body_lower.contains("cf_chl")) {
        return format!(
            "GraphQL bloqueado por Cloudflare em {} (status 403)",
            endpoint
        );
    }

    if status == 404 || status == 410 {
        return format!("GraphQL indisponivel em {} (status {})", endpoint, status);
    }

    let trimmed = truncate_for_error(body, 220);
    format!("GraphQL respondeu {} em {}: {}", status, endpoint, trimmed)
}

fn truncate_for_error(value: &str, max_len: usize) -> String {
    if value.len() <= max_len {
        return value.to_string();
    }
    let mut truncated = value.chars().take(max_len).collect::<String>();
    truncated.push_str("...");
    truncated
}

fn is_debug_enabled() -> bool {
    env::var("EPIC_GRAPHQL_DEBUG")
        .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

fn log_request_debug(method: &str, endpoint: &str, query: &str, variables: &Value) {
    let query_snippet = truncate_for_error(query, 160);
    let variables_snippet = truncate_for_error(&variables.to_string(), 200);
    let header_summary = debug_header_summary();
    eprintln!(
        "[epic_graphql] {} {} | query=\"{}\" | variables={} | headers={}",
        method, endpoint, query_snippet, variables_snippet, header_summary
    );
}

fn token_status(user: &LegendaryUser) -> Option<String> {
    let expires_at = user.expires_at.as_ref()?;
    let expires = parse_datetime(expires_at)?;
    let now = Utc::now();
    let remaining = expires.signed_duration_since(now).num_seconds();
    if remaining <= 0 {
        return Some(format!(
            "[epic_graphql] TOKEN EXPIRADO (expirou em {})",
            expires_at
        ));
    }
    Some(format!(
        "[epic_graphql] token ok. expira em {} ({}s restantes)",
        expires_at, remaining
    ))
}

fn parse_datetime(value: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|dt| dt.with_timezone(&Utc))
}

fn debug_header_summary() -> String {
    let user_agent = env::var("EPIC_USER_AGENT").unwrap_or_else(|_| DEFAULT_USER_AGENT.to_string());
    let accept_language =
        env::var("EPIC_ACCEPT_LANGUAGE").unwrap_or_else(|_| DEFAULT_ACCEPT_LANGUAGE.to_string());
    let origin = env::var("EPIC_ORIGIN").unwrap_or_else(|_| DEFAULT_ORIGIN.to_string());
    let referer = env::var("EPIC_REFERER").unwrap_or_else(|_| DEFAULT_REFERER.to_string());
    let accept = env::var("EPIC_ACCEPT").unwrap_or_else(|_| DEFAULT_ACCEPT.to_string());
    format!(
        "User-Agent=\"{}\" Accept=\"{}\" Accept-Language=\"{}\" Origin=\"{}\" Referer=\"{}\"",
        truncate_for_error(&user_agent, 120),
        accept,
        accept_language,
        origin,
        referer
    )
}
