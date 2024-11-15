// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::protocol::{
    events::{Event, Records},
    metadata::Metadata,
};

use anyhow::Result;

pub mod fs;
pub mod key_value;
pub mod memory;
pub mod redis;

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct NextRun {
    pub run_id: String,
    pub schedule_date: DateTime<Utc>,
}

pub trait BackendStore {
    fn read_events(&self, run_id: String) -> Result<Option<Records>>;

    fn write_events(&self, run_id: String, content: Records) -> Result<()>;

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

pub trait BackendMetadataWriter {
    /// Link a given run to a workflow
    /// since backends have no concept of workflows but only runs.
    fn write_workflow_link(&self, workflow_name: String, run_id: String) -> Result<()>;

    fn read_workflow_links(&self, workflow_name: String) -> Result<Vec<String>>;

    fn write_parent_child_link(&self, parent_run_id: String, child_run_id: String) -> Result<()>;

    fn read_direct_children(&self, parent_run_id: String) -> Result<Vec<String>>;

    fn enumerate_all_children(&self, parent_run_id: String) -> Result<Vec<String>>;

    fn read_all_metadata(&self, run_id: String) -> Result<Vec<Metadata>>;

    fn append_metadata(
        &self,
        run_id: String,
        schedule: DateTime<Utc>,
        content: String,
    ) -> Result<()>;
}

pub trait BackendAgent {
    fn next_run(&self, queue: String, exclude: Vec<String>) -> Result<Option<NextRun>>;

    fn active_leases(&self, lease_seconds: u32) -> Result<Vec<String>>;

    fn acquire_lease(&self, run_id: String, lease_seconds: u32) -> Result<bool>;

    fn renew_lease(&self, run_id: String, lease_seconds: u32) -> Result<bool>;

    fn remove_lease(&self, run_id: String, lease_seconds: u32) -> Result<()>;
}

pub trait Backend: BackendStore + BackendMetadataWriter + BackendAgent {}
