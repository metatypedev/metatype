use super::Backend;
use crate::protocol::{
    events::{Event, Records},
    metadata::Metadata,
};
use anyhow::{Context, Ok, Result};
use chrono::{DateTime, Utc};
use protobuf::Message;
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;

pub struct FsBackend {
    root: PathBuf,
}

impl FsBackend {
    pub fn new(root: &str) -> Self {
        let root = PathBuf::from(root);
        for d in &["runs", "schedules", "leases"] {
            fs::create_dir_all(root.join(d))
                .with_context(|| "Failed to create directory")
                .unwrap();
        }
        Self { root }
    }

    pub fn run_path(&self, run_id: &str) -> PathBuf {
        self.root.join("runs").join(run_id)
    }

    pub fn schedule_path(&self, queue: &str) -> PathBuf {
        self.root.join("schedules").join(queue)
    }
}

impl Backend for FsBackend {
    fn read_events(&self, run_id: String) -> Result<Option<Records>> {
        let f = self.run_path(&run_id).join("events");
        if !f.exists() {
            return Ok(None);
        }
        let file = fs::File::open(f)?;
        let content = file.bytes().collect::<Result<Vec<_>, _>>()?;
        Ok(Some(Records::parse_from_bytes(&content)?))
    }

    fn write_events(&self, run_id: String, content: Records) -> Result<()> {
        let f = self.run_path(&run_id).join("events");
        fs::create_dir_all(f.parent().with_context(|| "Parent")?)
            .with_context(|| "Failed to create directory")?;
        let mut file = fs::File::create(f).with_context(|| "Failed to create file")?;
        file.write_all(&content.write_to_bytes()?)
            .with_context(|| "Failed to write to file")?;
        Ok(())
    }

    fn read_all_metadata(&self, run_id: String) -> Result<Vec<Metadata>> {
        let mut ret = Vec::new();
        let f = self.run_path(&run_id).join("logs");
        if f.exists() {
            for log in fs::read_dir(f).with_context(|| "Failed to read directory")? {
                let log = log.with_context(|| "Failed to read log entry")?.path();
                let content = fs::File::open(&log)?
                    .bytes()
                    .collect::<Result<Vec<_>, _>>()?;
                ret.push(Metadata::parse_from_bytes(&content).unwrap());
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
        let f = self
            .run_path(&run_id)
            .join("logs")
            .join(schedule.to_rfc3339());
        fs::create_dir_all(f.parent().unwrap()).with_context(|| "Failed to create directory")?;
        let mut file = fs::File::create(f).with_context(|| "Failed to create log file")?;
        file.write_all(content.as_bytes())
            .with_context(|| "Failed to write to log file")?;
        Ok(())
    }

    fn add_schedule(
        &self,
        queue: String,
        run_id: String,
        schedule: DateTime<Utc>,
        content: Option<Event>,
    ) -> Result<()> {
        let q = self.schedule_path(&queue);

        if q.exists() {
            for sched in fs::read_dir(&q).with_context(|| "Failed to read schedule directory")? {
                let sched = sched
                    .with_context(|| "Failed to read schedule entry")?
                    .path();
                for planned in
                    fs::read_dir(&sched).with_context(|| "Failed to read planned directory")?
                {
                    let planned = planned
                        .with_context(|| "Failed to read planned entry")?
                        .path();
                    let planned_date =
                        DateTime::parse_from_rfc3339(sched.file_name().unwrap().to_str().unwrap())
                            .with_context(|| "Failed to parse date")?
                            .with_timezone(&Utc); // !
                    if planned.file_name().unwrap().to_string_lossy() == run_id
                        && planned_date <= schedule
                        && self
                            .read_schedule(queue.clone(), run_id.clone(), planned_date)?
                            .is_none()
                    {
                        self.close_schedule(queue.clone(), run_id.clone(), planned_date)?;
                    }
                }
            }
        }

        // ** https://datatracker.ietf.org/doc/html/rfc3339 **
        let f1 = q.join(schedule.to_rfc3339()).join(run_id);

        fs::create_dir_all(f1.parent().unwrap())
            .with_context(|| "Failed to create schedule directory")?;
        let mut file = fs::File::create(f1).with_context(|| "Failed to create schedule file")?;
        if let Some(content) = content {
            file.write_all(&content.write_to_bytes()?)
                .with_context(|| "Failed to write schedule file")
        } else {
            file.write_all(b"") // !
                .with_context(|| "Failed to write empty schedule file")
        }
    }

    fn read_schedule(
        &self,
        queue: String,
        run_id: String,
        schedule: DateTime<Utc>,
    ) -> Result<Option<Event>> {
        let f = self
            .schedule_path(&queue)
            .join(schedule.to_rfc3339())
            .join(run_id);
        if !f.exists() {
            return Ok(None);
        }

        let file = fs::File::open(f).with_context(|| "Failed to open schedule file")?;
        let content = file.bytes().collect::<Result<Vec<_>, _>>()?;
        Ok(if content.is_empty() {
            None
        } else {
            Some(Event::parse_from_bytes(&content)?)
        })
    }

    fn close_schedule(&self, queue: String, run_id: String, schedule: DateTime<Utc>) -> Result<()> {
        let f = self
            .schedule_path(&queue)
            .join(schedule.to_rfc3339())
            .join(run_id);
        if f.exists() {
            println!("closed {:?}", f);
            fs::remove_file(f).with_context(|| "Failed to delete schedule file")?;
        }

        Ok(())
    }
}
