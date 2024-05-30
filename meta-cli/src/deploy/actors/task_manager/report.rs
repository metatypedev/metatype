// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::StopReason;
use crate::deploy::actors::task::{action::TaskAction, TaskFinishStatus};
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

#[derive(Default, Debug)]
pub struct ReportSummary {
    pub text: String,
    pub success: bool,
}

impl<A: TaskAction> Report<A> {
    pub fn summary(&self) -> ReportSummary {
        self.entries
            .iter()
            .fold(Default::default(), |mut summary, entry| {
                let (text, success) = match &entry.status {
                    TaskFinishStatus::<A>::Finished(results) => {
                        let success_count = results.iter().filter(|res| res.is_ok()).count();
                        (
                            format!(
                                " - {}: {}/{} success\n",
                                entry.path.display().to_string().yellow(),
                                success_count,
                                results.len()
                            ),
                            success_count == results.len(),
                        )
                    }
                    TaskFinishStatus::<A>::Error => (" - failed\n".to_string(), false),
                    TaskFinishStatus::<A>::Cancelled => (" - cancelled\n".to_string(), true),
                };
                summary.text.push_str(&text);
                ReportSummary {
                    text: summary.text,
                    success: summary.success && success,
                }
            })
    }
}
