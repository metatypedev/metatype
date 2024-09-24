use std::sync::Mutex;

use super::{Backend, BackendMetadataWriter, NextRun};
use crate::protocol::{
    events::{Event, Records},
    metadata::Metadata,
};
use anyhow::{bail, Context, Ok, Result};
use chrono::{DateTime, Duration, Utc};
use protobuf::Message;
use redis::{Commands, Script};

pub struct RedisBackend {
    _con: Mutex<redis::Connection>,
}

impl Backend for RedisBackend {}

impl RedisBackend {
    pub fn new(con_str: String) -> Result<Self> {
        let client = redis::Client::open(con_str)?;
        Ok(Self {
            _con: Mutex::new(client.get_connection()?),
        })
    }

    fn key(&self, parts: &[&str]) -> String {
        format!("sub::{}", parts.join("::"))
    }

    fn parts(&self, key: &str) -> Result<Vec<String>> {
        let parts = key
            .strip_prefix("sub::")
            .with_context(|| format!("Invalid  key found: {:?}", key))?
            .split("::")
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
        let key = self.key(&["runs", &run_id, "events"]);
        self.with_redis(|r| {
            if r.exists(&key)? {
                return Ok(None);
            }
            let val: Vec<u8> = r.get(key)?;
            Ok(Some(Records::parse_from_bytes(&val)?))
        })
    }

    fn write_events(&self, run_id: String, content: Records) -> Result<()> {
        let key = self.key(&["runs", &run_id, "events"]);
        self.with_redis(|r| {
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
            let q_key = self.key(&["schedules", &queue]); // priority queue

            // Now add the new schedule
            let sched_ref = schedule.to_rfc3339();
            let sched_score = 1.0 / (schedule.timestamp() as f64);
            let sched_key = self.key(&[&sched_ref, &run_id]);
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
        let sched_key = self.key(&[&schedule.to_rfc3339(), &run_id]);
        self.with_redis(|r| {
            if !r.exists(&sched_key)? {
                bail!("schedule not found: {}", sched_key)
            }

            let value: Vec<u8> = r.get(&sched_key)?;
            match value.is_empty() {
                true => Ok(None),
                false => Ok(Some(Event::parse_from_bytes(&value)?)),
            }
        })
    }

    fn close_schedule(&self, queue: String, run_id: String, schedule: DateTime<Utc>) -> Result<()> {
        self.with_redis(|r| {
            let q_key = self.key(&["schedules", &queue]);
            let sched_ref = schedule.to_rfc3339();
            let sched_key = self.key(&[&sched_ref, &run_id]);

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
        let q_key = self.key(&["schedules", &queue]); // priority queue
        self.with_redis(|r| {
            // TODO: lua
            let schedules: Vec<String> = r.zrange(q_key, 0, -1)?;
            for schedule in schedules {
                let run_ids: Vec<String> = r.zrange(&schedule, 0, -1)?;
                for run_id in run_ids {
                    println!("{excludes:?} vs {run_id:?}");
                    if !excludes.contains(&run_id) {
                        return Ok(Some(NextRun {
                            run_id,
                            schedule_date: DateTime::parse_from_rfc3339(&schedule)?.to_utc(),
                        }));
                    }
                }
            }

            Ok(None)
        })
    }

    fn active_leases(&self, _lease_seconds: u32) -> Result<Vec<String>> {
        self.with_redis(|r| {
            let all_leases_key = self.key(&["leases"]);
            let script = Script::new(
                r#"
                    local all_leases_key = KEYS[1];
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
                println!("{:?} and {:?}", sched_ref, exp_time);
                if exp_time > Utc::now() {
                    let run_id = self
                        .parts(&sched_ref)?
                        .last()
                        .cloned()
                        .with_context(|| format!("Could not find run_id in p {}", sched_ref))?;

                    active_lease_ids.push(run_id);
                }
            }

            Ok(active_lease_ids)
        })
    }

    fn acquire_lease(&self, run_id: String, lease_seconds: u32) -> Result<bool> {
        self.with_redis(|r| {
            let all_leases_key = self.key(&["leases"]);
            let lease_ref = self.key(&["lease", &run_id]);

            // TODO:
            // 1. exist + get should be atomic
            // 2. integrity check to ensure it is a part of the "leases" set
            let mut not_held = true;
            if r.exists(&lease_ref)? {
                not_held = false;
                let value: String = r.get(&lease_ref)?;
                let exp_time = DateTime::parse_from_rfc3339(&value)?.to_utc();

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
            let lease_ref = self.key(&["lease", &run_id]);
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
                bail!("lease not found: {}", lease_ref);
            }

            Ok(true)
        })
    }

    fn remove_lease(&self, run_id: String, _lease_seconds: u32) -> Result<()> {
        self.with_redis(|r| {
            let all_leases_key = self.key(&["leases"]);
            let lease_ref = self.key(&["lease", &run_id]);

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
        let base_key = self.key(&["runs", &run_id, "logs"]);
        let mut ret = Vec::new();

        let schedules: Vec<String> = self.with_redis(|r| r.lrange(base_key, 0, -1))?;

        for schedule in schedules {
            let log: Vec<u8> = self.with_redis(|r| r.get(self.key(&[&run_id, &schedule])))?;
            ret.push(Metadata::parse_from_bytes(&log)?);
        }

        Ok(ret)
    }

    fn append_metadata(
        &self,
        run_id: String,
        schedule: DateTime<Utc>,
        content: String,
    ) -> Result<()> {
        self.with_redis(|r| {
            let base_key = self.key(&["runs", &run_id, "logs"]); // queue
            let sched_key = self.key(&[&run_id, &schedule.to_rfc3339()]);

            let script = Script::new(
                r#"
                    local base_key = KEYS[1]
                    local sched_key = KEYS[2]
                    local content = ARGV[1]

                    redis.call("LPUSH", base_key, sched_key)
                    redis.call("ZREM", sched_key, content)
                "#,
            );

            script.key(base_key).key(sched_key).arg(content).invoke(r)?;
            Ok(())
        })
    }

    fn write_workflow_link(&self, workflow_name: String, run_id: String) -> Result<()> {
        self.with_redis(|r| {
            let links_key = self.key(&["links", &workflow_name]);
            r.zadd(links_key, run_id, 0)?;
            Ok(())
        })
    }

    fn read_workflow_links(&self, workflow_name: String) -> Result<Vec<String>> {
        self.with_redis(|r| {
            let links_key = self.key(&["links", &workflow_name]);
            let run_ids: Vec<String> = r.zrange(links_key, 0, -1)?;
            Ok(run_ids)
        })
    }
}
