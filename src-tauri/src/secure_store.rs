use keyring::{Entry, Error as KeyringError};

const SERVICE_NAME: &str = "epic-light-launcher";
const ACCOUNT_SUPABASE_SESSION: &str = "supabase_session";

fn session_entry() -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, ACCOUNT_SUPABASE_SESSION)
        .map_err(|e| format!("Falha ao abrir secure store do sistema: {}", e))
}

pub fn set_supabase_session(session_json: String) -> Result<(), String> {
    let entry = session_entry()?;
    entry
        .set_password(session_json.as_str())
        .map_err(|e| format!("Falha ao salvar sessao no secure store: {}", e))
}

pub fn get_supabase_session() -> Result<Option<String>, String> {
    let entry = session_entry()?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(e) => Err(format!("Falha ao ler sessao no secure store: {}", e)),
    }
}

pub fn clear_supabase_session() -> Result<(), String> {
    let entry = session_entry()?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(KeyringError::NoEntry) => Ok(()),
        Err(e) => Err(format!("Falha ao limpar sessao no secure store: {}", e)),
    }
}
