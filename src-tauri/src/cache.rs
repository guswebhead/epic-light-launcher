use std::sync::Mutex;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

type CacheData = (String, u64); // (data, timestamp)

lazy_static::lazy_static! {
    static ref CACHE: Mutex<HashMap<String, CacheData>> = Mutex::new(HashMap::new());
}

const CACHE_DURATION_SECS: u64 = 3600; // 1 hora

pub fn get(key: &str) -> Option<String> {
    let cache = CACHE.lock().unwrap();
    
    if let Some((data, timestamp)) = cache.get(key) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        if now - timestamp < CACHE_DURATION_SECS {
            return Some(data.clone());
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
    cache.insert(key, (data, now));
}

pub fn clear(key: &str) {
    let mut cache = CACHE.lock().unwrap();
    cache.remove(key);
}

pub fn clear_all() {
    let mut cache = CACHE.lock().unwrap();
    cache.clear();
}
