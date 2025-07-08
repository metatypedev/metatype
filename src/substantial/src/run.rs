// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{backends::Backend, protocol::events::Records};

use anyhow::{bail, Context, Ok, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(tag = "type")]
pub enum SavedValue {
    Retry {
        counter: i32,
        wait_until: DateTime<Utc>,
    },
    Resolved {
        payload: serde_json::Value,
    },
    Failed {
        err: serde_json::Value,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(tag = "type")]
pub enum LogLevel {
    Warn,
    Info,
    Error,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum RunResult {
    Ok(serde_json::Value),
    Err(serde_json::Value),
}

/// Bridge between protobuf types and Typescript
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(tag = "type")]
pub enum OperationEvent {
    Sleep {
        id: u32,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    },
    Save {
        id: u32,
        value: SavedValue,
    },
    Send {
        event_name: String,
        value: serde_json::Value,
    },
    Stop {
        result: Option<RunResult>,
    },
    Start {
        kwargs: HashMap<String, serde_json::Value>,
    },
    Log {
        id: u32,
        payload: serde_json::Value,
        level: LogLevel,
    },
    Compensate,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct Operation {
    pub at: DateTime<Utc>,
    pub event: OperationEvent,
}

/// A Run is a set of operations
///
/// Each operation is produced from the workflow execution
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct Run {
    pub run_id: String,
    pub operations: Vec<Operation>,
}

impl Run {
    pub fn new(run_id: String) -> Self {
        Self {
            run_id,
            operations: vec![],
        }
    }

    pub fn recover_from(&mut self, backend: &dyn Backend) -> Result<()> {
        if let Some(records) = backend.read_events(self.run_id.clone())? {
            let operations = records
                .events
                .into_iter()
                .map(|event| event.try_into())
                .collect::<Result<Vec<Operation>>>()
                .with_context(|| {
                    format!("Recovering operations from backend for {}", self.run_id)
                })?;
            self.operations = operations;
            self.compact();
        }

        Ok(())
    }

    pub fn persist_into(&mut self, backend: &dyn Backend) -> Result<()> {
        self.compact();

        let mut records = Records::new();
        records.events = self
            .operations
            .clone()
            .into_iter()
            .map(|op| op.try_into())
            .collect::<Result<_>>()?;
        backend.write_events(self.run_id.clone(), records)?;
        Ok(())
    }

    pub fn clear(&mut self) {
        self.operations.clear()
    }

    pub fn reset(&mut self) {
        self.operations = vec![];
    }

    /// Try to recover from dups such as
    ///
    /// ```ignore
    ///  [Start Start ...] or
    ///  [... Stop Stop] or
    ///  [ .... Event X Event X ... ]
    /// ```
    ///
    /// These dups can occur when we crash at a given timing
    /// and the underlying event of the appointed schedule was not closed.
    /// The engine will happily append onto the operation log,
    /// we throw by default but realistically we can recover.
    ///
    /// WARN: undesirable side effects can still happen if we crash before saving the Saved results.
    ///
    pub fn compact(&mut self) {
        let mut operations = Vec::new();
        let mut seen_operations = HashSet::new();

        for operation in &self.operations {
            let key = (operation.at, operation.event.safe_to_string());
            if seen_operations.contains(&key) {
                continue;
            }

            operations.push(operation.clone());
            seen_operations.insert(key);
        }

        self.operations = operations;
    }
    pub fn check_against_new(&self, run: &Run) -> Result<()> {
        let old_ops = &self.operations;
        let new_ops = &run.operations;

        for (old, new) in old_ops.iter().zip(new_ops) {
            let mut issues = vec![];

            if old.event != new.event {
                issues.push("Events do not match".to_owned());
            }

            if old.at != new.at {
                issues.push("Schedule timestamp does not match".to_owned());
            }

            if !issues.is_empty() {
                bail!(
                    "Workflow run is not deterministic after comparing {} (old) and {} (new): {}",
                    old.event.safe_to_string(),
                    new.event.safe_to_string(),
                    issues.join(", ")
                );
            }
        }

        if old_ops.len() > new_ops.len() {
            bail!(
                "Run logs are matching up to {}, the provided run is older",
                self.operations
                    .last()
                    .map(|last| format!("the event {}", last.event.safe_to_string(),))
                    .unwrap_or_else(|| "0 event".to_string())
            )
        }

        Ok(())
    }
}

impl OperationEvent {
    pub fn safe_to_string(&self) -> String {
        match self {
            OperationEvent::Sleep { id, start, end } => {
                format!("Sleep(id={id}, start={start}, end={end})")
            }
            OperationEvent::Save { id, .. } => format!("Save(id={id})"),
            OperationEvent::Send { event_name, .. } => format!("Send(event_name={event_name:?})"),
            OperationEvent::Stop { .. } => format!("Stop"),
            OperationEvent::Start { kwargs } => format!(
                "Start(kwargs = {{{}}})",
                kwargs
                    .keys()
                    .map(|k| k.to_string())
                    .collect::<Vec<_>>()
                    .join(", ")
            ),
            OperationEvent::Log { id, level, .. } => format!(
                "Log(id={}, level={})",
                id,
                match level {
                    LogLevel::Warn => "Warn",
                    LogLevel::Info => "Info",
                    LogLevel::Error => "Error",
                }
            ),
            OperationEvent::Compensate => format!("Compensate"),
        }
    }
}
