use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use chrono::{DateTime, Duration, Utc};
use rand_core::OsRng;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

lazy_static::lazy_static! {
    static ref DB_LOCK: Mutex<()> = Mutex::new(());
}

const PASSWORD_ALGO_ARGON2ID: &str = "argon2id";
const PASSWORD_ALGO_SHA256: &str = "sha256";
const LOGIN_WINDOW_SECONDS: i64 = 5 * 60;
const LOGIN_BLOCK_SECONDS: i64 = 5 * 60;
const MAX_FAILED_LOGINS: i64 = 5;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthUser {
    pub id: i64,
    pub username: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserGameData {
    pub app_name: String,
    pub custom_tags: Vec<String>,
    pub notes: String,
    pub playtime_minutes: i64,
    pub rating: Option<i64>,
    pub updated_at: String,
}

struct LoginRateState {
    failed_count: i64,
    first_failed_at: Option<DateTime<Utc>>,
    blocked_until: Option<DateTime<Utc>>,
}

pub fn register(username: String, password: String) -> Result<AuthUser, String> {
    let normalized_username = normalize_username(username.as_str())?;
    validate_password(password.as_str())?;

    let _lock = DB_LOCK
        .lock()
        .map_err(|_| "Falha ao bloquear banco local.".to_string())?;
    let conn = open_connection()?;

    let now = Utc::now().to_rfc3339();
    let password_hash = hash_password_argon2(password.as_str())?;

    let inserted = conn
        .execute(
            "INSERT OR IGNORE INTO users (
                username,
                password_hash,
                salt,
                created_at,
                password_algo
            ) VALUES (?1, ?2, '', ?3, ?4)",
            params![
                normalized_username,
                password_hash,
                now,
                PASSWORD_ALGO_ARGON2ID
            ],
        )
        .map_err(|e| format!("Falha ao criar usuario: {}", e))?;

    if inserted == 0 {
        return Err("Nome de usuario ja cadastrado.".to_string());
    }

    clear_login_rate_limit(&conn, normalized_username.as_str())?;

    let user_id = conn.last_insert_rowid();
    set_session(&conn, user_id)?;
    get_user_by_id(&conn, user_id)?
        .ok_or_else(|| "Usuario criado, mas nao foi encontrado no banco.".to_string())
}

pub fn login(username: String, password: String) -> Result<AuthUser, String> {
    let normalized_username = normalize_username(username.as_str())?;
    if password.is_empty() {
        return Err("Senha obrigatoria.".to_string());
    }

    let _lock = DB_LOCK
        .lock()
        .map_err(|_| "Falha ao bloquear banco local.".to_string())?;
    let conn = open_connection()?;

    if let Some(blocked_message) = get_login_block_message(&conn, normalized_username.as_str())? {
        return Err(blocked_message);
    }

    let row = conn
        .query_row(
            "SELECT id, username, password_hash, salt, created_at, COALESCE(password_algo, 'sha256')
             FROM users
             WHERE username = ?1",
            params![normalized_username],
            |r| {
                Ok((
                    r.get::<_, i64>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                    r.get::<_, String>(5)?,
                ))
            },
        )
        .optional()
        .map_err(|e| format!("Falha ao buscar usuario: {}", e))?;

    let (id, stored_username, stored_hash, salt, created_at, password_algo) = match row {
        Some(value) => value,
        None => {
            register_failed_login_attempt(&conn, normalized_username.as_str())?;
            return Err("Usuario ou senha invalidos.".to_string());
        }
    };

    let password_valid = verify_password(
        password.as_str(),
        stored_hash.as_str(),
        salt.as_str(),
        password_algo.as_str(),
    )?;

    if !password_valid {
        register_failed_login_attempt(&conn, normalized_username.as_str())?;
        return Err("Usuario ou senha invalidos.".to_string());
    }

    clear_login_rate_limit(&conn, normalized_username.as_str())?;

    if is_legacy_password_hash(password_algo.as_str(), stored_hash.as_str()) {
        let upgraded_hash = hash_password_argon2(password.as_str())?;
        conn.execute(
            "UPDATE users
             SET password_hash = ?1, salt = '', password_algo = ?2
             WHERE id = ?3",
            params![upgraded_hash, PASSWORD_ALGO_ARGON2ID, id],
        )
        .map_err(|e| format!("Falha ao atualizar hash de senha: {}", e))?;
    }

    set_session(&conn, id)?;
    Ok(AuthUser {
        id,
        username: stored_username,
        created_at,
    })
}

pub fn logout() -> Result<(), String> {
    let _lock = DB_LOCK
        .lock()
        .map_err(|_| "Falha ao bloquear banco local.".to_string())?;
    let conn = open_connection()?;
    conn.execute("DELETE FROM session WHERE id = 1", [])
        .map_err(|e| format!("Falha ao encerrar sessao: {}", e))?;
    Ok(())
}

pub fn current_user() -> Result<Option<AuthUser>, String> {
    let _lock = DB_LOCK
        .lock()
        .map_err(|_| "Falha ao bloquear banco local.".to_string())?;
    let conn = open_connection()?;
    conn.query_row(
        "SELECT u.id, u.username, u.created_at
         FROM session s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.id = 1",
        [],
        |row| {
            Ok(AuthUser {
                id: row.get(0)?,
                username: row.get(1)?,
                created_at: row.get(2)?,
            })
        },
    )
    .optional()
    .map_err(|e| format!("Falha ao ler sessao atual: {}", e))
}

pub fn upsert_game_data(
    app_name: String,
    custom_tags: Vec<String>,
    notes: String,
    playtime_minutes: i64,
    rating: Option<i64>,
) -> Result<UserGameData, String> {
    let app_name = normalize_app_name(app_name.as_str())?;
    let notes = normalize_notes(notes.as_str())?;
    let custom_tags = sanitize_tags(custom_tags);
    let playtime_minutes = normalize_playtime(playtime_minutes)?;
    let rating = normalize_rating(rating)?;

    let _lock = DB_LOCK
        .lock()
        .map_err(|_| "Falha ao bloquear banco local.".to_string())?;
    let conn = open_connection()?;
    let user_id = current_user_id(&conn)?
        .ok_or_else(|| "Sessao local nao encontrada. Faca login.".to_string())?;
    let tags_json = serde_json::to_string(&custom_tags)
        .map_err(|e| format!("Falha ao serializar tags: {}", e))?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO user_game_data (
            user_id,
            app_name,
            custom_tags,
            notes,
            playtime_minutes,
            rating,
            updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(user_id, app_name) DO UPDATE SET
            custom_tags = excluded.custom_tags,
            notes = excluded.notes,
            playtime_minutes = excluded.playtime_minutes,
            rating = excluded.rating,
            updated_at = excluded.updated_at",
        params![
            user_id,
            app_name,
            tags_json,
            notes,
            playtime_minutes,
            rating,
            now
        ],
    )
    .map_err(|e| format!("Falha ao salvar dados do jogo: {}", e))?;

    get_game_data_by_user(&conn, user_id, app_name.as_str())?
        .ok_or_else(|| "Dados salvos, mas nao foi possivel recarregar o registro.".to_string())
}

pub fn get_game_data(app_name: String) -> Result<Option<UserGameData>, String> {
    let app_name = normalize_app_name(app_name.as_str())?;

    let _lock = DB_LOCK
        .lock()
        .map_err(|_| "Falha ao bloquear banco local.".to_string())?;
    let conn = open_connection()?;
    let user_id = current_user_id(&conn)?
        .ok_or_else(|| "Sessao local nao encontrada. Faca login.".to_string())?;
    get_game_data_by_user(&conn, user_id, app_name.as_str())
}

pub fn list_game_data() -> Result<Vec<UserGameData>, String> {
    let _lock = DB_LOCK
        .lock()
        .map_err(|_| "Falha ao bloquear banco local.".to_string())?;
    let conn = open_connection()?;
    let user_id = current_user_id(&conn)?
        .ok_or_else(|| "Sessao local nao encontrada. Faca login.".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT app_name, custom_tags, notes, playtime_minutes, rating, updated_at
             FROM user_game_data
             WHERE user_id = ?1
             ORDER BY updated_at DESC",
        )
        .map_err(|e| format!("Falha ao preparar consulta de dados do usuario: {}", e))?;

    let rows = stmt
        .query_map(params![user_id], |row| {
            let raw_tags: String = row.get(1)?;
            let tags = serde_json::from_str::<Vec<String>>(raw_tags.as_str()).unwrap_or_default();
            Ok(UserGameData {
                app_name: row.get(0)?,
                custom_tags: tags,
                notes: row.get(2)?,
                playtime_minutes: row.get(3)?,
                rating: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("Falha ao buscar dados do usuario: {}", e))?;

    let mut all = Vec::new();
    for row in rows {
        all.push(row.map_err(|e| format!("Falha ao processar linha de dados do usuario: {}", e))?);
    }

    Ok(all)
}

fn get_game_data_by_user(
    conn: &Connection,
    user_id: i64,
    app_name: &str,
) -> Result<Option<UserGameData>, String> {
    let row = conn
        .query_row(
            "SELECT app_name, custom_tags, notes, playtime_minutes, rating, updated_at
             FROM user_game_data
             WHERE user_id = ?1 AND app_name = ?2",
            params![user_id, app_name],
            |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, i64>(3)?,
                    r.get::<_, Option<i64>>(4)?,
                    r.get::<_, String>(5)?,
                ))
            },
        )
        .optional()
        .map_err(|e| format!("Falha ao buscar dados do jogo: {}", e))?;

    let Some((app_name, raw_tags, notes, playtime_minutes, rating, updated_at)) = row else {
        return Ok(None);
    };

    let custom_tags = serde_json::from_str::<Vec<String>>(raw_tags.as_str()).unwrap_or_default();

    Ok(Some(UserGameData {
        app_name,
        custom_tags,
        notes,
        playtime_minutes,
        rating,
        updated_at,
    }))
}

fn current_user_id(conn: &Connection) -> Result<Option<i64>, String> {
    conn.query_row("SELECT user_id FROM session WHERE id = 1", [], |row| row.get(0))
        .optional()
        .map_err(|e| format!("Falha ao buscar sessao local: {}", e))
}

fn set_session(conn: &Connection, user_id: i64) -> Result<(), String> {
    conn.execute(
        "INSERT INTO session (id, user_id, created_at)
         VALUES (1, ?1, ?2)
         ON CONFLICT(id) DO UPDATE SET
           user_id = excluded.user_id,
           created_at = excluded.created_at",
        params![user_id, Utc::now().to_rfc3339()],
    )
    .map_err(|e| format!("Falha ao atualizar sessao local: {}", e))?;
    Ok(())
}

fn get_user_by_id(conn: &Connection, user_id: i64) -> Result<Option<AuthUser>, String> {
    conn.query_row(
        "SELECT id, username, created_at FROM users WHERE id = ?1",
        params![user_id],
        |row| {
            Ok(AuthUser {
                id: row.get(0)?,
                username: row.get(1)?,
                created_at: row.get(2)?,
            })
        },
    )
    .optional()
    .map_err(|e| format!("Falha ao buscar usuario criado: {}", e))
}

fn get_login_block_message(conn: &Connection, username: &str) -> Result<Option<String>, String> {
    let state = get_login_rate_state(conn, username)?;
    let Some(rate_state) = state else {
        return Ok(None);
    };

    let Some(blocked_until) = rate_state.blocked_until else {
        return Ok(None);
    };

    let now = Utc::now();
    if blocked_until <= now {
        clear_login_rate_limit(conn, username)?;
        return Ok(None);
    }

    let remaining_seconds = blocked_until.signed_duration_since(now).num_seconds().max(1);
    Ok(Some(format!(
        "Muitas tentativas de login. Tente novamente em {} segundos.",
        remaining_seconds
    )))
}

fn register_failed_login_attempt(conn: &Connection, username: &str) -> Result<(), String> {
    let now = Utc::now();
    let existing = get_login_rate_state(conn, username)?;

    let (failed_count, first_failed_at, blocked_until) = if let Some(state) = existing {
        if let Some(blocked) = state.blocked_until {
            if blocked > now {
                (
                    state.failed_count,
                    state.first_failed_at.unwrap_or(now),
                    Some(blocked),
                )
            } else {
                (1, now, None)
            }
        } else if let Some(first) = state.first_failed_at {
            if now.signed_duration_since(first).num_seconds() > LOGIN_WINDOW_SECONDS {
                (1, now, None)
            } else {
                let next_count = state.failed_count + 1;
                if next_count >= MAX_FAILED_LOGINS {
                    (
                        next_count,
                        first,
                        Some(now + Duration::seconds(LOGIN_BLOCK_SECONDS)),
                    )
                } else {
                    (next_count, first, None)
                }
            }
        } else {
            (1, now, None)
        }
    } else {
        (1, now, None)
    };

    let first_failed_at_str = first_failed_at.to_rfc3339();
    let blocked_until_str = blocked_until.map(|value| value.to_rfc3339());

    conn.execute(
        "INSERT INTO auth_rate_limit (
            username,
            failed_count,
            first_failed_at,
            blocked_until
        ) VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(username) DO UPDATE SET
            failed_count = excluded.failed_count,
            first_failed_at = excluded.first_failed_at,
            blocked_until = excluded.blocked_until",
        params![
            username,
            failed_count,
            first_failed_at_str,
            blocked_until_str
        ],
    )
    .map_err(|e| format!("Falha ao atualizar rate limit de login: {}", e))?;

    Ok(())
}

fn clear_login_rate_limit(conn: &Connection, username: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM auth_rate_limit WHERE username = ?1",
        params![username],
    )
    .map_err(|e| format!("Falha ao limpar rate limit de login: {}", e))?;
    Ok(())
}

fn get_login_rate_state(conn: &Connection, username: &str) -> Result<Option<LoginRateState>, String> {
    conn.query_row(
        "SELECT failed_count, first_failed_at, blocked_until
         FROM auth_rate_limit
         WHERE username = ?1",
        params![username],
        |row| {
            let first_failed_raw: Option<String> = row.get(1)?;
            let blocked_until_raw: Option<String> = row.get(2)?;
            Ok(LoginRateState {
                failed_count: row.get(0)?,
                first_failed_at: first_failed_raw.as_deref().and_then(parse_datetime),
                blocked_until: blocked_until_raw.as_deref().and_then(parse_datetime),
            })
        },
    )
    .optional()
    .map_err(|e| format!("Falha ao consultar rate limit de login: {}", e))
}

fn parse_datetime(raw: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(raw)
        .ok()
        .map(|dt| dt.with_timezone(&Utc))
}

fn normalize_username(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.len() < 3 || trimmed.len() > 32 {
        return Err("Usuario deve ter entre 3 e 32 caracteres.".to_string());
    }
    if !trimmed
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' || ch == '.')
    {
        return Err("Usuario aceita apenas letras, numeros, '.', '_' e '-'.".to_string());
    }
    Ok(trimmed.to_string())
}

fn validate_password(password: &str) -> Result<(), String> {
    if password.len() < 8 {
        return Err("Senha deve ter pelo menos 8 caracteres.".to_string());
    }
    if password.len() > 128 {
        return Err("Senha muito longa (maximo 128 caracteres).".to_string());
    }
    Ok(())
}

fn normalize_app_name(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("App name obrigatorio.".to_string());
    }
    if trimmed.len() > 160 {
        return Err("App name muito longo.".to_string());
    }
    Ok(trimmed.to_string())
}

fn normalize_notes(raw: &str) -> Result<String, String> {
    if raw.len() > 8000 {
        return Err("Notas muito longas (maximo 8000 caracteres).".to_string());
    }
    Ok(raw.trim().to_string())
}

fn normalize_playtime(value: i64) -> Result<i64, String> {
    if value < 0 {
        return Err("Tempo jogado nao pode ser negativo.".to_string());
    }
    if value > 10_000_000 {
        return Err("Tempo jogado invalido.".to_string());
    }
    Ok(value)
}

fn normalize_rating(value: Option<i64>) -> Result<Option<i64>, String> {
    match value {
        None => Ok(None),
        Some(v) if (1..=5).contains(&v) => Ok(Some(v)),
        Some(_) => Err("Rating deve estar entre 1 e 5.".to_string()),
    }
}

fn sanitize_tags(tags: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::new();

    for tag in tags {
        let trimmed = tag.trim();
        if trimmed.is_empty() {
            continue;
        }
        let clipped = trimmed.chars().take(32).collect::<String>();
        let key = clipped.to_lowercase();
        if seen.contains(key.as_str()) {
            continue;
        }
        seen.insert(key);
        normalized.push(clipped);
        if normalized.len() >= 20 {
            break;
        }
    }

    normalized
}

fn is_legacy_password_hash(password_algo: &str, password_hash: &str) -> bool {
    password_algo.eq_ignore_ascii_case(PASSWORD_ALGO_SHA256)
        || !password_hash.starts_with("$argon2")
}

fn verify_password(
    password: &str,
    password_hash: &str,
    salt: &str,
    password_algo: &str,
) -> Result<bool, String> {
    if !is_legacy_password_hash(password_algo, password_hash) {
        return Ok(verify_password_argon2(password, password_hash));
    }

    let incoming_hash = hash_password_sha256(password, salt);
    Ok(incoming_hash == password_hash)
}

fn hash_password_argon2(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| format!("Falha ao gerar hash Argon2: {}", e))
        .map(|hash| hash.to_string())
}

fn verify_password_argon2(password: &str, password_hash: &str) -> bool {
    let parsed = match PasswordHash::new(password_hash) {
        Ok(value) => value,
        Err(_) => return false,
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok()
}

fn hash_password_sha256(password: &str, salt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(salt.as_bytes());
    hasher.update(b":");
    hasher.update(password.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn open_connection() -> Result<Connection, String> {
    let db_path = db_path();
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Falha ao preparar pasta do banco local: {}", e))?;
    }

    let conn = Connection::open(db_path)
        .map_err(|e| format!("Falha ao abrir banco local SQLite: {}", e))?;

    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            password_algo TEXT NOT NULL DEFAULT 'sha256'
        );
        CREATE TABLE IF NOT EXISTS session (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS auth_rate_limit (
            username TEXT PRIMARY KEY,
            failed_count INTEGER NOT NULL DEFAULT 0,
            first_failed_at TEXT,
            blocked_until TEXT
        );
        CREATE TABLE IF NOT EXISTS user_game_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            app_name TEXT NOT NULL,
            custom_tags TEXT NOT NULL DEFAULT '[]',
            notes TEXT NOT NULL DEFAULT '',
            playtime_minutes INTEGER NOT NULL DEFAULT 0,
            rating INTEGER,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, app_name),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
        );
        ",
    )
    .map_err(|e| format!("Falha ao aplicar schema SQLite local: {}", e))?;

    migrate_legacy_schema(&conn)?;
    Ok(conn)
}

fn migrate_legacy_schema(conn: &Connection) -> Result<(), String> {
    match conn.execute(
        "ALTER TABLE users ADD COLUMN password_algo TEXT NOT NULL DEFAULT 'sha256'",
        [],
    ) {
        Ok(_) => {}
        Err(error) => {
            let message = error.to_string().to_lowercase();
            if !message.contains("duplicate column name") {
                return Err(format!("Falha ao migrar schema de usuarios: {}", error));
            }
        }
    }

    Ok(())
}

fn db_path() -> PathBuf {
    let base = dirs::data_local_dir()
        .or_else(dirs::data_dir)
        .unwrap_or_else(std::env::temp_dir);
    base.join("epic-light-launcher").join("omega_local.db")
}
