use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};

type CacheData = (String, u64); // (data, timestamp)

lazy_static::lazy_static! {
    static ref CACHE: Mutex<HashMap<String, CacheData>> = Mutex::new(HashMap::new());
}

const CACHE_DURATION_SECS: u64 = 3600; // 1 hora

#[derive(Serialize, Deserialize)]
struct PersistedCache {
    data: String,
    timestamp: u64,
}

pub fn get(key: &str) -> Option<String> {
    let cache = CACHE.lock().unwrap();
    let mut expired = false;
    
    if let Some((data, timestamp)) = cache.get(key) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        if now - timestamp < CACHE_DURATION_SECS {
            return Some(data.clone());
        }
        expired = true;
    }

    drop(cache);
    if expired {
        let mut cache = CACHE.lock().unwrap();
        cache.remove(key);
    }

    if let Some((data, timestamp)) = read_from_disk(key) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        if now - timestamp < CACHE_DURATION_SECS {
            let mut cache = CACHE.lock().unwrap();
            cache.insert(key.to_string(), (data.clone(), timestamp));
            return Some(data);
        } else {
            let _ = delete_from_disk(key);
        }
    }

    None
}

pub fn set(key: String, data: String) {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let mut cache = CACHE.lock().unwrap();
    cache.insert(key.clone(), (data.clone(), now));
    let _ = write_to_disk(&key, &data, now);
}

pub fn clear(key: &str) {
    let mut cache = CACHE.lock().unwrap();
    cache.remove(key);
    let _ = delete_from_disk(key);
}

pub fn clear_all() {
    let mut cache = CACHE.lock().unwrap();
    cache.clear();
    let _ = clear_disk_cache();
}

fn cache_dir() -> PathBuf {
    let base = dirs::cache_dir().unwrap_or_else(std::env::temp_dir);
    base.join("epic-light-launcher")
}

fn cache_file_path(key: &str) -> PathBuf {
    cache_dir().join(format!("{}.json", key))
}

fn read_from_disk(key: &str) -> Option<CacheData> {
    let path = cache_file_path(key);
    let content = fs::read_to_string(path).ok()?;
    let persisted: PersistedCache = serde_json::from_str(&content).ok()?;
    Some((persisted.data, persisted.timestamp))
}

fn write_to_disk(key: &str, data: &str, timestamp: u64) -> std::io::Result<()> {
    let dir = cache_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }
    let path = cache_file_path(key);
    let persisted = PersistedCache {
        data: data.to_string(),
        timestamp,
    };
    let content = serde_json::to_string(&persisted)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    fs::write(path, content)?;
    Ok(())
}

fn delete_from_disk(key: &str) -> std::io::Result<()> {
    let path = cache_file_path(key);
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

fn clear_disk_cache() -> std::io::Result<()> {
    let path = cache_dir();
    if path.exists() {
        fs::remove_dir_all(path)?;
    }
    Ok(())
}
