// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::StopReason;
use crate::deploy::actors::task::{
    action::{OutputData, TaskAction},
    TaskFinishStatus,
};
use color_eyre::owo_colors::OwoColorize;
use std::{path::Path, sync::Arc};

#[derive(Debug)]
pub struct ReportEntry<A: TaskAction> {
    pub path: Arc<Path>,
    pub status: TaskFinishStatus<A>,
}

#[derive(Debug)]
pub struct Report<A: TaskAction> {
    pub stop_reason: StopReason,
    pub entries: Vec<ReportEntry<A>>,
}

#[derive(Debug)]
pub struct ReportSummary {
    pub text: String,
    pub success: bool,
}

impl<A: TaskAction> Report<A> {
    pub fn summary(&self) -> ReportSummary {
        self.entries.iter().fold(
            ReportSummary {
                text: String::new(),
                success: true,
            },
            |mut summary, entry| {
                if let Some((text, success)) = entry.get_summary() {
                    summary
                        .text
                        .push_str(format!("  - {}: {}\n", entry.path.display(), text).as_str());
                    summary.success = summary.success && success;
                }
                summary
            },
        )
    }
}

impl<A: TaskAction> ReportEntry<A> {
    fn get_summary(&self) -> Option<(String, bool)> {
        match &self.status {
            TaskFinishStatus::<A>::Finished(results) => {
                let success = results
                    .iter()
                    .filter(|(_, res)| res.as_ref().ok().map(|r| r.is_success()).unwrap_or(false))
                    .map(|(name, _)| name.clone())
                    .collect::<Vec<_>>();
                let total = results.len();
                let success_count = success.len();
                let mut res = String::new();
                if success_count > 0 {
                    res.push_str(
                        &format!("{}/{} success", success_count, total)
                            .green()
                            .to_string(),
                    );
                    res.push_str(&format!(" ({})", success.join(", ")));
                }
                let failure_count = total - success_count;
                if failure_count > 0 {
                    if success_count > 0 {
                        res.push_str("  ");
                    }
                    res.push_str(
                        &format!("{}/{} failure", failure_count, total)
                            .red()
                            .to_string(),
                    );
                }
                Some((res, success_count == total))
            }
            TaskFinishStatus::<A>::Error => Some(("failed".to_string(), false)),
            TaskFinishStatus::<A>::Cancelled => Some(("cancelled".to_string(), true)),
        }
    }
}
