use super::Backend;
use crate::protocol::{
    events::{Event, Records},
    metadata::Metadata,
};
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use protobuf::Message;
use std::sync::Arc;
use std::{collections::HashMap, sync::RwLock};

pub struct MemoryBackend {
    storage: Arc<RwLock<HashMap<String, Vec<u8>>>>,
}

impl Default for MemoryBackend {
    fn default() -> Self {
        Self::new()
    }
}

impl MemoryBackend {
    pub fn new() -> Self {
        Self {
            storage: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    fn run_key(&self, run_id: &str, subpath: &str) -> String {
        format!("runs/{}/{}", run_id, subpath)
    }

    fn schedule_key(&self, queue: &str, run_id: &str, schedule: &DateTime<Utc>) -> String {
        format!("schedules/{}/{}/{}", queue, schedule.to_rfc3339(), run_id)
    }

    fn get(&self, key: &str) -> Option<Vec<u8>> {
        self.storage.write().unwrap().get(key).cloned()
    }

    fn put(&self, key: &str, value: Vec<u8>) {
        self.storage.write().unwrap().insert(key.to_string(), value);
    }

    fn remove(&self, key: &str) {
        self.storage.write().unwrap().remove(key);
    }

    fn exists(&self, key: &str) -> bool {
        self.storage.write().unwrap().contains_key(key)
    }
}

impl Backend for MemoryBackend {
    fn read_events(&self, run_id: String) -> Result<Option<Records>> {
        let key = self.run_key(&run_id, "events");
        if let Some(content) = self.get(&key) {
            Ok(Some(Records::parse_from_bytes(&content)?))
        } else {
            Ok(None)
        }
    }

    fn write_events(&self, run_id: String, content: Records) -> Result<()> {
        let key = self.run_key(&run_id, "events");
        self.put(key.as_str(), content.write_to_bytes()?);
        Ok(())
    }

    fn read_all_metadata(&self, run_id: String) -> Result<Vec<Metadata>> {
        let mut ret = Vec::new();
        let base_key = self.run_key(&run_id, "logs");

        for (key, value) in self.storage.write().unwrap().iter() {
            if key.starts_with(&base_key) {
                ret.push(Metadata::parse_from_bytes(value)?);
            }
        }

        Ok(ret)
    }

    fn append_metadata(
        &self,
        run_id: String,
        schedule: DateTime<Utc>,
        content: String,
    ) -> Result<()> {
        let key = self.run_key(&run_id, &format!("logs/{}", schedule.to_rfc3339()));
        self.put(key.as_str(), content.into_bytes());
        Ok(())
    }

    fn add_schedule(
        &self,
        queue: String,
        run_id: String,
        schedule: DateTime<Utc>,
        content: Option<Event>,
    ) -> Result<()> {
        let key = self.schedule_key(&queue, &run_id, &schedule);

        // Check for existing schedules and remove if necessary
        let prefix = format!("schedules/{}/", queue);
        for existing_key in self
            .storage
            .write()
            .unwrap()
            .keys()
            .filter(|k| k.starts_with(&prefix))
            .cloned()
            .collect::<Vec<_>>()
        {
            let parts: Vec<&str> = existing_key.split('/').collect();
            if parts.len() == 4 && parts[3] == run_id {
                let planned_date = DateTime::parse_from_rfc3339(parts[2])
                    .with_context(|| "Failed to parse date")?;
                if planned_date <= schedule
                    && self
                        .read_schedule(
                            queue.clone(),
                            run_id.clone(),
                            planned_date.with_timezone(&Utc),
                        )?
                        .is_none()
                {
                    self.close_schedule(
                        queue.clone(),
                        run_id.clone(),
                        planned_date.with_timezone(&Utc),
                    )?;
                }
            }
        }

        let content_bytes = content
            .map(|event| {
                event.write_to_bytes().unwrap()
                // .with_context(|| "Failed to serialize event")
            })
            .unwrap_or_default();
        self.put(&key, content_bytes);

        Ok(())
    }

    fn read_schedule(
        &self,
        queue: String,
        run_id: String,
        schedule: DateTime<Utc>,
    ) -> Result<Option<Event>> {
        let key = self.schedule_key(&queue, &run_id, &schedule);
        if let Some(content) = self.get(&key) {
            if content.is_empty() {
                Ok(None)
            } else {
                Ok(Some(Event::parse_from_bytes(&content)?))
            }
        } else {
            Ok(None)
        }
    }

    fn close_schedule(&self, queue: String, run_id: String, schedule: DateTime<Utc>) -> Result<()> {
        let key = self.schedule_key(&queue, &run_id, &schedule);
        if self.exists(&key) {
            println!("closed {:?}", key);
            self.remove(&key);
        }

        Ok(())
    }
}
