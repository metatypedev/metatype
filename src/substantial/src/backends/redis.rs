// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::sync::Mutex;

use super::{Backend, BackendMetadataWriter, NextRun};
use crate::{
    converters::{MetadataEvent, MetadataPayload},
    protocol::{
        events::{Event, Records},
        metadata::Metadata,
    },
};
use anyhow::{bail, Context, Ok, Result};
use chrono::{DateTime, Duration, Utc};
use protobuf::Message;
use redis::{Commands, Script};

pub struct RedisBackend {
    _con: Mutex<redis::Connection>,
    base_prefix: String,
    separator: String,
}

impl Backend for RedisBackend {}

impl RedisBackend {
    pub fn new(con_str: String, prefix: Option<String>) -> Result<Self> {
        let client = redis::Client::open(con_str)?;
        Ok(Self {
            // TODO: use a connection pool, this can get noticibly slow even locally
            // There is r2d2-redis but it's very outdated as of now
            _con: Mutex::new(client.get_connection()?),
            separator: ":/".to_owned(),
            base_prefix: format!(
                "{}:substantial:",
                prefix.unwrap_or_else(|| "default".to_owned())
            ),
        })
    }

    fn key(&self, parts: &[&str]) -> Result<String> {
        let invalid_chunks = parts
            .iter()
            .filter(|part| part.contains(&self.separator))
            .collect::<Vec<_>>();

        if !invalid_chunks.is_empty() {
            bail!(
                "Fatal: parts {:?} cannot contain seperator {:?}",
                invalid_chunks,
                self.separator
            )
        }

        Ok(format!(
            "{}{}",
            self.base_prefix,
            parts.join(&self.separator)
        ))
    }

    fn parts(&self, key: &str) -> Result<Vec<String>> {
        let parts = key
            .strip_prefix(&self.base_prefix)
            .with_context(|| {
                format!(
                    "Invalid key {:?}: required prefix {:?} not present",
                    key, self.base_prefix
                )
            })?
            .split(&self.separator)
            .map(|p| p.to_owned())
            .collect::<Vec<_>>();
        Ok(parts)
    }

    pub fn with_redis<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&mut redis::Connection) -> R,
    {
        let mut con = self._con.lock().unwrap();
        f(&mut con)
    }
}

impl super::BackendStore for RedisBackend {
    fn read_events(&self, run_id: String) -> Result<Option<Records>> {
        self.with_redis(|r| {
            let event_key = self.key(&["runs", &run_id, "events"])?;
            let script = Script::new(
                r#"
                local event_key = KEYS[1]
                if redis.call("EXISTS", event_key) == 1 then
                    return redis.call("GET", event_key)
                else
                    return nil
                end
            "#,
            );

            let lua_ret: Option<Vec<u8>> = script.key(event_key).invoke(r)?;

            lua_ret.map_or(Ok(None), |raw_rec| {
                Ok(Some(Records::parse_from_bytes(&raw_rec)?))
            })
        })
    }

    fn write_events(&self, run_id: String, content: Records) -> Result<()> {
        self.with_redis(|r| {
            let key = self.key(&["runs", &run_id, "events"])?;
            r.set(key, content.write_to_bytes()?)?;
            Ok(())
        })
    }

    fn add_schedule(
        &self,
        queue: String,
        run_id: String,
        schedule: DateTime<Utc>,
        content: Option<Event>,
    ) -> Result<()> {
        self.with_redis(|r| {
            let q_key = self.key(&["schedules", &queue])?; // priority queue

            let non_prefixed_sched_ref = schedule.to_rfc3339();
            let sched_score = 1.0 / (schedule.timestamp() as f64);
            let sched_key = self.key(&[&non_prefixed_sched_ref, &run_id])?;
            let sched_ref = self.key(&["ref_", &run_id, &non_prefixed_sched_ref])?;

            let script = Script::new(
                r#"
                local q_key = KEYS[1]
                local sched_ref = KEYS[2]
                local sched_key = KEYS[3]
                local sched_score = tonumber(ARGV[1])
                local run_id = ARGV[2]
                local content = ARGV[3]

                redis.call("ZADD", q_key, 0, sched_ref)
                redis.call("ZADD", sched_ref, sched_score, run_id)
                redis.call("SET", sched_key, content)
            "#,
            );

            script
                .key(q_key)
                .key(sched_ref.clone())
                .key(sched_key)
                .arg(sched_score)
                .arg(run_id)
                .arg(match content {
                    Some(event) => event.write_to_bytes()?,
                    None => vec![],
                })
                .invoke(r)?;

            Ok(())
        })
    }

    fn read_schedule(
        &self,
        _queue: String,
        run_id: String,
        schedule: DateTime<Utc>,
    ) -> Result<Option<Event>> {
        self.with_redis(|r| {
            let sched_key = self.key(&[&schedule.to_rfc3339(), &run_id])?;
            let script = Script::new(
                r#"
                local sched_key = KEYS[1]
                if redis.call("EXISTS", sched_key) == 1 then
                    return redis.call("GET", sched_key)
                else
                    return nil
                end
            "#,
            );

            let lua_ret: Option<Vec<u8>> = script.key(&sched_key).invoke(r)?;
            if let Some(event_raw) = lua_ret {
                match event_raw.is_empty() {
                    true => Ok(None),
                    false => Ok(Some(Event::parse_from_bytes(&event_raw)?)),
                }
            } else {
                bail!("schedule not found: {:?}", sched_key)
            }
        })
    }

    fn close_schedule(&self, queue: String, run_id: String, schedule: DateTime<Utc>) -> Result<()> {
        self.with_redis(|r| {
            let q_key: String = self.key(&["schedules", &queue])?;
            let non_prefixed_sched_ref = schedule.to_rfc3339();
            let sched_key = self.key(&[&non_prefixed_sched_ref, &run_id])?;
            let sched_ref = self.key(&["ref_", &run_id, &non_prefixed_sched_ref])?;

            let script = Script::new(
                r#"
                    local q_key = KEYS[1]
                    local sched_ref = KEYS[2]
                    local sched_key = KEYS[3]
                    local run_id = ARGV[1]

                    redis.call("ZREM", q_key, sched_ref)
                    redis.call("ZREM", sched_ref, run_id)
                    redis.call("DEL", sched_key)
                "#,
            );

            script
                .key(q_key)
                .key(sched_ref.clone())
                .key(sched_key)
                .arg(run_id)
                .invoke(r)?;
            Ok(())
        })
    }
}

impl super::BackendAgent for RedisBackend {
    fn next_run(&self, queue: String, excludes: Vec<String>) -> Result<Option<NextRun>> {
        self.with_redis(|r| {
            let q_key = self.key(&["schedules", &queue])?; // priority queue

            // FIXME: refactor this out, one blocker being that
            // redis will complain if ARGV is used in any 'indirect' form or manner
            // such as within a function (even local): "Attempt to modify a readonly table script"
            let script = Script::new(
                r#"
                    local q_key = KEYS[1]
                    local excludes = ARGV
                    local schedule_refs = redis.call("ZRANGE", q_key, 0, -1)

                    for _, schedule_ref in ipairs(schedule_refs) do
                        local run_ids = redis.call("ZRANGE", schedule_ref, 0, -1)
                        for _, run_id in ipairs(run_ids) do
                            local is_excluded = false
                            for k = 1, #excludes do
                                if run_id == excludes[k] then
                                    is_excluded = true
                                    break
                                end
                            end

                            if not is_excluded then
                                return {run_id, schedule_ref}
                            end
                        end
                    end

                    return nil
                "#,
            );

            let lua_ret: Option<(String, String)> = script.key(q_key).arg(excludes).invoke(r)?;

            if let Some((run_id, schedule_ref)) = lua_ret {
                let schedule = self
                    .parts(&schedule_ref)?
                    .last()
                    .cloned()
                    .with_context(|| format!("Invalid key {:?}", schedule_ref))?;

                return Ok(Some(NextRun {
                    run_id,
                    schedule_date: DateTime::parse_from_rfc3339(&schedule)
                        .with_context(|| format!("Parsing {:?}", schedule))?
                        .to_utc(),
                }));
            }

            Ok(None)
        })
    }

    fn active_leases(&self, _lease_seconds: u32) -> Result<Vec<String>> {
        self.with_redis(|r| {
            let all_leases_key = self.key(&["leases"])?;
            let script = Script::new(
                r#"
                    local all_leases_key = KEYS[1]

                    local lease_refs = redis.call("ZRANGE", all_leases_key, 0, -1)
                    local results = {}
                    for i, lease_ref in ipairs(lease_refs) do
                        local exp_time = redis.call("GET", lease_ref)
                        table.insert(results, lease_ref)
                        table.insert(results, exp_time)
                    end

                    return results
                "#,
            );

            let lua_ret: Vec<String> = script.key(all_leases_key).invoke(r)?;
            let mut iter = lua_ret.into_iter();
            let mut active_lease_ids = Vec::new();

            while let (Some(sched_ref), Some(exp_time)) = (iter.next(), iter.next()) {
                let exp_time = DateTime::parse_from_rfc3339(&exp_time)?.to_utc();
                if exp_time > Utc::now() {
                    let run_id =
                        self.parts(&sched_ref)?.last().cloned().with_context(|| {
                            format!("Could not parse run_id from {:?}", sched_ref)
                        })?;

                    active_lease_ids.push(run_id);
                }
            }

            Ok(active_lease_ids)
        })
    }

    fn acquire_lease(&self, run_id: String, lease_seconds: u32) -> Result<bool> {
        self.with_redis(|r| {
            let all_leases_key = self.key(&["leases"])?;
            let lease_ref = self.key(&["lease", &run_id])?;

            let mut not_held = true;
            let script = Script::new(
                r#"
                local all_leases_key = KEYS[1]
                local lease_ref = KEYS[2]
                if redis.call("EXISTS", lease_ref) == 1 then
                    if redis.call("ZRANK", all_leases_key, lease_ref) == nil then
                        error("Invalid state: integrity failure, lease ref " .. lease_ref .. " is not an element of " .. all_leases_key)
                    end
                    return redis.call("GET", lease_ref)                    
                else
                    return nil
                end
            "#,
            );

            let lua_ret: Option<String> = script.key(&all_leases_key).key(&lease_ref).invoke(r)?;

            if let Some(exp_time_str) = lua_ret {
                not_held = false;
                let exp_time = DateTime::parse_from_rfc3339(&exp_time_str)?.to_utc();
                if exp_time < Utc::now() {
                    not_held = true;
                }
            }

            if not_held {
                let lease_exp = Utc::now() + Duration::seconds(lease_seconds as i64);
                let lease_exp = lease_exp.to_rfc3339();
                let script = Script::new(
                    r#"
                        local all_leases_key = KEYS[1]
                        local lease_ref = KEYS[2]
                        local lease_exp = ARGV[1]

                        redis.call("ZADD", all_leases_key, 0, lease_ref)
                        redis.call("SET", lease_ref, lease_exp)
                    "#,
                );
                script
                    .key(all_leases_key)
                    .key(lease_ref)
                    .arg(lease_exp)
                    .invoke(r)?;

                return Ok(true);
            }

            Ok(false)
        })
    }

    fn renew_lease(&self, run_id: String, lease_seconds: u32) -> Result<bool> {
        self.with_redis(|r| {
            let lease_ref = self.key(&["lease", &run_id])?;
            let new_lease_exp = (Utc::now() + Duration::seconds(lease_seconds as i64)).to_rfc3339();

            let script = Script::new(
                r#"
                    local lease_ref = KEYS[1]
                    local new_lease_exp = ARGV[1]

                    if redis.call("EXISTS", lease_ref) == 1 then
                        redis.call("SET", lease_ref, new_lease_exp)
                        return 1
                    else
                        return 0
                    end
                "#,
            );
            let lua_ret: u8 = script.key(&lease_ref).arg(new_lease_exp).invoke(r)?;

            if lua_ret == 0 {
                bail!("lease not found: {:?}", lease_ref);
            }

            Ok(true)
        })
    }

    fn remove_lease(&self, run_id: String, _lease_seconds: u32) -> Result<()> {
        self.with_redis(|r| {
            let all_leases_key = self.key(&["leases"])?;
            let lease_ref = self.key(&["lease", &run_id])?;

            let script = Script::new(
                r#"
                    local all_leases_key = KEYS[1]
                    local lease_ref = KEYS[2]

                    redis.call("ZREM", all_leases_key, lease_ref)
                    redis.call("DEL", lease_ref)
                "#,
            );

            script.key(all_leases_key).key(lease_ref).invoke(r)?;
            Ok(())
        })
    }
}

impl BackendMetadataWriter for RedisBackend {
    fn read_all_metadata(&self, run_id: String) -> Result<Vec<Metadata>> {
        self.with_redis(|r| {
            let log_key = self.key(&["runs", &run_id, "logs"])?;

            let script = Script::new(
                r#"
                    local log_key = KEYS[1]
                    local run_id = ARGV[1]
    
                    local sched_keys = redis.call("LRANGE", log_key, 0, -1)
                    local logs = {}
                    for _, sched_key in ipairs(sched_keys) do
                        if string.find(sched_key, run_id) ~= nil then
                            local content = redis.call("GET", sched_key)
                            table.insert(logs, content)
                        end
                    end

                    return logs
                "#,
            );

            let raw_logs: Vec<Vec<u8>> = script.key(log_key).arg(run_id).invoke(r)?;

            let mut ret = Vec::new();
            for raw_log in raw_logs.iter() {
                ret.push(Metadata::parse_from_bytes(raw_log)?);
            }

            Ok(ret)
        })
    }

    fn append_metadata(
        &self,
        run_id: String,
        schedule: DateTime<Utc>,
        content: String,
    ) -> Result<()> {
        self.with_redis(|r| {
            let log_key = self.key(&["runs", &run_id, "logs"])?; // queue
            let sched_key = self.key(&[&run_id, &schedule.to_rfc3339()])?;

            let script = Script::new(
                r#"
                    local log_key = KEYS[1]
                    local sched_key = KEYS[2]
                    local content = ARGV[1]

                    redis.call("LPUSH", log_key, sched_key)
                    redis.call("SET", sched_key, content)
                "#,
            );

            let content = MetadataEvent {
                at: Utc::now(),
                metadata: Some(MetadataPayload::Info(
                    serde_json::to_value(content).unwrap(),
                )),
            };

            let metadata = TryInto::<Metadata>::try_into(content)?;

            script
                .key(log_key)
                .key(sched_key)
                .arg(metadata.write_to_bytes()?)
                .invoke(r)?;
            Ok(())
        })
    }

    fn write_workflow_link(&self, workflow_name: String, run_id: String) -> Result<()> {
        self.with_redis(|r| {
            let links_key = self.key(&["links", "runs", &workflow_name])?;
            r.zadd(links_key, run_id, 0)?;
            Ok(())
        })
    }

    fn read_workflow_links(&self, workflow_name: String) -> Result<Vec<String>> {
        self.with_redis(|r| {
            let links_key = self.key(&["links", "runs", &workflow_name])?;
            let run_ids: Vec<String> = r.zrange(links_key, 0, -1)?;
            Ok(run_ids)
        })
    }

    fn write_parent_child_link(&self, parent_run_id: String, child_run_id: String) -> Result<()> {
        self.with_redis(|r| {
            let links_key = self.key(&["links", "children", &parent_run_id])?;
            r.zadd(links_key, child_run_id, 0)?;
            Ok(())
        })
    }

    fn read_direct_children(&self, parent_run_id: String) -> Result<Vec<String>> {
        self.with_redis(|r| {
            let links_key = self.key(&["links", "children", &parent_run_id])?;
            let run_ids: Vec<String> = r.zrange(links_key, 0, -1)?;
            Ok(run_ids)
        })
    }

    fn enumerate_all_children(&self, parent_run_id: String) -> Result<Vec<String>> {
        self.with_redis(|r| {
            let links_prefix = self.key(&["links", "children"])?;
            let separator = self.separator.clone();

            let script = Script::new(
                r#"
                    local parent_run_id = ARGV[1]
                    local prefix = ARGV[2]
                    local separator = ARGV[3]

                    local stack = {parent_run_id}
                    local visited = {}
                    local result = {}

                    while #stack > 0 do
                        local run_id = table.remove(stack)

                        if not visited[run_id] then
                            visited[run_id] = true
                            table.insert(result, run_id)

                            local key = prefix .. separator .. run_id
                            local children = redis.call("ZRANGE", key, 0, -1)
                            for i = #children, 1, -1 do
                                table.insert(stack, children[i])
                            end
                        end
                    end

                    return result
                "#,
            );

            let mut result: Vec<String> = script
                .arg(&parent_run_id)
                .arg(links_prefix)
                .arg(separator)
                .invoke(r)?;

            result.retain(|rid| rid != &parent_run_id);

            Ok(result)
        })
    }
}
