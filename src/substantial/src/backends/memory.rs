use super::key_value::{Item, KeyValueBackend, KeyValueLike};
use anyhow::Result;
use chrono::{DateTime, Utc};
use lazy_static::lazy_static;
use std::sync::RwLock;
use std::{collections::HashMap, sync::Arc};

lazy_static! {
    static ref STORAGE: Arc<RwLock<HashMap<String, Item>>> = Arc::new(RwLock::new(HashMap::new()));
}

pub struct BasicMemoryStore;

impl KeyValueLike for BasicMemoryStore {
    fn run_key(&self, run_id: &str, subpath: &str) -> Result<String> {
        Ok(format!("runs/{}/{}", run_id, subpath))
    }

    fn schedule_key(&self, queue: &str, run_id: &str, schedule: &DateTime<Utc>) -> Result<String> {
        Ok(format!(
            "schedules/{}/{}/{}",
            queue,
            schedule.to_rfc3339(),
            run_id
        ))
    }

    fn get(&self, key: &str) -> Result<Option<Item>> {
        Ok(STORAGE.read().unwrap().get(key).cloned())
    }

    fn put(&self, key: &str, value: Item) -> Result<()> {
        STORAGE.write().unwrap().insert(key.to_string(), value);
        Ok(())
    }

    fn remove(&self, key: &str) -> Result<()> {
        STORAGE.write().unwrap().remove(key);
        Ok(())
    }

    fn exists(&self, key: &str) -> Result<bool> {
        Ok(STORAGE.write().unwrap().contains_key(key))
    }

    fn keys(&self) -> Result<Vec<String>> {
        Ok(STORAGE
            .read()
            .unwrap()
            .keys()
            .map(|k| k.to_owned())
            .collect())
    }
}

pub struct MemoryBackend(KeyValueBackend);

impl Default for MemoryBackend {
    fn default() -> Self {
        MemoryBackend(KeyValueBackend {
            store: Box::new(BasicMemoryStore),
        })
    }
}

impl MemoryBackend {
    pub fn unwrap(self) -> KeyValueBackend {
        self.0
    }
}
