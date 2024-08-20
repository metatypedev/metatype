use chrono::{DateTime, Utc};

use crate::protocol::{
    events::{Event, Records},
    metadata::Metadata,
};

use anyhow::Result;

pub mod fs;
pub mod memory;

pub trait Backend {
    fn read_events(&self, run_id: String) -> Result<Option<Records>>;

    fn write_events(&self, run_id: String, content: Records) -> Result<()>;

    fn read_all_metadata(&self, run_id: String) -> Result<Vec<Metadata>>;

    fn append_metadata(
        &self,
        run_id: String,
        schedule: DateTime<Utc>,
        content: String,
    ) -> Result<()>;

    fn add_schedule(
        &self,
        queue: String,
        run_id: String,
        schedule: DateTime<Utc>,
        content: Option<Event>,
    ) -> Result<()>;

    fn read_schedule(
        &self,
        queue: String,
        run_id: String,
        schedule: DateTime<Utc>,
    ) -> Result<Option<Event>>;

    fn close_schedule(&self, queue: String, run_id: String, schedule: DateTime<Utc>) -> Result<()>;
}
