// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{
    path::{Path, PathBuf},
    time::Duration,
};

use anyhow::{Context, Result};
use log::info;
use notify_debouncer_mini::{
    new_debouncer,
    notify::{self, RecommendedWatcher, RecursiveMode},
    DebounceEventResult, Debouncer,
};
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver};

pub struct Watcher {
    debouncer: Debouncer<RecommendedWatcher>,
    rx: UnboundedReceiver<PathBuf>,
}

impl Watcher {
    pub fn new() -> Result<Self> {
        let (tx, rx) = unbounded_channel();
        let mut debouncer =
            new_debouncer(Duration::from_secs(1), move |res: DebounceEventResult| {
                let events = res.unwrap();
                for path in events.into_iter().map(|e| e.path) {
                    tx.send(path).unwrap();
                }
            })?;
        debouncer.watcher().configure(
            notify::Config::default()
                .with_poll_interval(Duration::from_secs(1))
                .with_compare_contents(false), // TODO configurable?
        )?;

        Ok(Self { debouncer, rx })
    }

    pub fn watch(&mut self, path: &Path) -> Result<()> {
        let watcher = self.debouncer.watcher();
        info!("Watching {path:?}...");
        watcher
            .watch(path, RecursiveMode::Recursive)
            .with_context(|| format!("Watching {path:?}"))?;
        Ok(())
    }

    pub async fn next(&mut self) -> Option<PathBuf> {
        self.rx.recv().await
    }
}
