// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Backend, BackendMetadataWriter, NextRun};
use crate::{
    converters::{MetadataEvent, MetadataPayload},
    protocol::{
        events::{Event, Records},
        metadata::Metadata,
    },
};
use anyhow::{bail, Context, Result};
use chrono::{DateTime, Duration, Utc};
use protobuf::Message;
use std::collections::HashSet;

pub struct KeyValueBackend {
    pub store: Box<dyn KeyValueLike>,
}

impl Backend for KeyValueBackend {}

impl super::BackendStore for KeyValueBackend {
    fn read_events(&self, run_id: String) -> Result<Option<Records>> {
        let key = self.store.run_key(&run_id, "events")?;
        if let Some(content) = self.store.get(&key)? {
            Ok(Some(Records::parse_from_bytes(&content.data)?))
        } else {
            Ok(None)
        }
    }

    fn write_events(&self, run_id: String, content: Records) -> Result<()> {
        let key = self.store.run_key(&run_id, "events")?;
        self.store
            .put(key.as_str(), Item::new(content.write_to_bytes()?))?;
        Ok(())
    }

    fn add_schedule(
        &self,
        queue: String,
        run_id: String,
        schedule: DateTime<Utc>,
        content: Option<Event>,
    ) -> Result<()> {
        let key = self.store.schedule_key(&queue, &run_id, &schedule)?;

        // Check for existing schedules and remove if necessary
        let prefix = format!("schedules/{}/", queue);
        for existing_key in self
            .store
            .keys()?
            .iter()
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
        self.store.put(&key, Item::new(content_bytes))?;

        Ok(())
    }

    fn read_schedule(
        &self,
        queue: String,
        run_id: String,
        schedule: DateTime<Utc>,
    ) -> Result<Option<Event>> {
        let key = self.store.schedule_key(&queue, &run_id, &schedule)?;
        if let Some(content) = self.store.get(&key)? {
            if content.data.is_empty() {
                Ok(None)
            } else {
                Ok(Some(Event::parse_from_bytes(&content.data)?))
            }
        } else {
            Ok(None)
        }
    }

    fn close_schedule(&self, queue: String, run_id: String, schedule: DateTime<Utc>) -> Result<()> {
        let key = self.store.schedule_key(&queue, &run_id, &schedule)?;
        if !self.store.exists(&key)? {
            bail!("cannot close missing schedule {key:?}")
        }

        self.store.remove(&key)?;

        Ok(())
    }
}

impl super::BackendAgent for KeyValueBackend {
    fn next_run(&self, queue: String, excludes: Vec<String>) -> Result<Option<NextRun>> {
        let schedule_prefix = format!("schedules/{}/", queue);
        let excludes_set = excludes.into_iter().collect::<HashSet<_>>();

        let mut schedules = self
            .store
            .keys()?
            .into_iter()
            .filter(|key| key.starts_with(&schedule_prefix))
            .collect::<Vec<_>>();

        schedules.sort();

        for schedule_key in schedules {
            let schedule_parts: Vec<&str> = schedule_key.split('/').collect();
            if schedule_parts.len() != 4 {
                continue; // Invalid schedule format
            }

            let run_id = schedule_parts[3];
            if !excludes_set.contains(run_id) {
                let schedule_date = DateTime::parse_from_rfc3339(schedule_parts[2])
                    .with_context(|| {
                        format!("Failed to parse schedule date {:?}", schedule_parts[2])
                    })?
                    .with_timezone(&Utc); // !
                return Ok(Some(NextRun {
                    run_id: run_id.to_string(),
                    schedule_date,
                }));
            }
        }

        Ok(None)
    }

    fn active_leases(&self, _lease_seconds: u32) -> Result<Vec<String>> {
        let mut active_lease_ids = Vec::new();
        let prefix = "leases/";
        let lease_keys = self
            .store
            .keys()?
            .into_iter()
            .filter(|k| k.starts_with(prefix));

        for key in lease_keys {
            if let Some(value) = self.store.get(&key)? {
                let exp_time = DateTime::parse_from_rfc3339(&String::from_utf8(value.data)?)?
                    .with_timezone(&Utc);

                if exp_time > Utc::now() {
                    let run_id = key.strip_prefix(prefix).unwrap().to_string();
                    active_lease_ids.push(run_id);
                }
            }
        }

        Ok(active_lease_ids)
    }

    fn acquire_lease(&self, run_id: String, lease_seconds: u32) -> Result<bool> {
        let lease_key = format!("leases/{}", run_id);
        let mut not_held = true;
        if let Some(held) = self.store.get(&lease_key)? {
            not_held = false;
            let exp_time =
                DateTime::parse_from_rfc3339(&String::from_utf8(held.data)?)?.with_timezone(&Utc);

            if exp_time < Utc::now() {
                not_held = true;
            }
        }

        if not_held {
            let lease_exp = Utc::now() + Duration::seconds(lease_seconds as i64);
            self.store
                .put(&lease_key, Item::new(lease_exp.to_rfc3339().into_bytes()))?;
            return Ok(true);
        }

        Ok(false)
    }

    fn renew_lease(&self, run_id: String, lease_seconds: u32) -> Result<bool> {
        let lease_key = format!("leases/{}", run_id);
        if !self.store.exists(&lease_key)? {
            bail!("lease not found: {}", lease_key);
        }

        let new_lease_exp = Utc::now() + Duration::seconds(lease_seconds as i64);
        self.store.put(
            &lease_key,
            Item::new(new_lease_exp.to_rfc3339().into_bytes()),
        )?;

        Ok(true)
    }

    fn remove_lease(&self, run_id: String, _lease_seconds: u32) -> Result<()> {
        let lease_key = format!("leases/{}", run_id);
        if !self.store.exists(&lease_key)? {
            bail!("lease not found: {}", lease_key);
        }
        self.store.remove(&lease_key)?;

        Ok(())
    }
}

impl BackendMetadataWriter for KeyValueBackend {
    fn read_all_metadata(&self, run_id: String) -> Result<Vec<Metadata>> {
        let mut ret = Vec::new();
        let base_key = self.store.run_key(&run_id, "logs")?;

        for key in self.store.keys()? {
            let value = self.store.get(&key)?.unwrap();
            if key.starts_with(&base_key) {
                ret.push(Metadata::parse_from_bytes(&value.data)?);
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
        let key = self
            .store
            .run_key(&run_id, &format!("logs/{}", schedule.to_rfc3339()))?;

        let content = MetadataEvent {
            at: Utc::now(),
            metadata: Some(MetadataPayload::Info(
                serde_json::to_value(content).unwrap(),
            )),
        };

        let metadata = TryInto::<Metadata>::try_into(content)?;

        self.store
            .put(key.as_str(), Item::new(metadata.write_to_bytes()?))?;
        Ok(())
    }

    fn write_workflow_link(&self, workflow_name: String, run_id: String) -> Result<()> {
        let key = format!("links/runs/{}/{}", workflow_name, run_id);
        self.store.put(key.as_str(), Item::new(run_id.into_bytes()))
    }

    fn read_workflow_links(&self, workflow_name: String) -> Result<Vec<String>> {
        let mut ret = Vec::new();
        let base_key = format!("links/runs/{}/", workflow_name);

        for key in self.store.keys()? {
            let value = self.store.get(&key)?.unwrap();
            if key.starts_with(&base_key) {
                ret.push(String::from_utf8(value.data)?);
            }
        }

        Ok(ret)
    }

    fn write_parent_child_link(&self, parent_run_id: String, child_run_id: String) -> Result<()> {
        let key = format!("links/children/{}/{}", parent_run_id, child_run_id);
        self.store
            .put(key.as_str(), Item::new(child_run_id.into_bytes()))
    }

    fn read_direct_children(&self, parent_run_id: String) -> Result<Vec<String>> {
        let mut ret = Vec::new();
        let base_key = format!("links/children/{}/", parent_run_id);

        for key in self.store.keys()? {
            let value = self
                .store
                .get(&key)?
                .with_context(|| format!("Get known key {:?}", key))
                .unwrap();

            if key.starts_with(&base_key) {
                ret.push(String::from_utf8(value.data)?);
            }
        }

        Ok(ret)
    }

    fn enumerate_all_children(&self, parent_run_id: String) -> Result<Vec<String>> {
        let mut visited = Vec::new();
        let mut stack = vec![parent_run_id.clone()];
        let mut result = Vec::new();

        while let Some(run_id) = stack.pop() {
            if !visited.contains(&run_id) {
                visited.push(run_id.clone());
                result.push(run_id.clone());

                let children = self.read_direct_children(run_id)?;
                stack.extend(children);
            }
        }

        result.retain(|rid| rid != &parent_run_id);

        Ok(result)
    }
}

// Note: always consume &self to make sure implementers never owns a kind of internal state by themselves

#[derive(Debug, Clone)]
pub struct Item {
    pub data: Vec<u8>,
    pub mtime: DateTime<Utc>,
}

impl Item {
    pub fn new(data: Vec<u8>) -> Self {
        Self {
            data,
            mtime: Utc::now(),
        }
    }
}

pub trait KeyValueLike {
    fn run_key(&self, run_id: &str, subpath: &str) -> Result<String>;

    fn schedule_key(&self, queue: &str, run_id: &str, schedule: &DateTime<Utc>) -> Result<String>;

    fn get(&self, key: &str) -> Result<Option<Item>>;

    fn put(&self, key: &str, value: Item) -> Result<()>;

    fn remove(&self, key: &str) -> Result<()>;

    fn exists(&self, key: &str) -> Result<bool>;

    fn keys(&self) -> Result<Vec<String>>;
}
