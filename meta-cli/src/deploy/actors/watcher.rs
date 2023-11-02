// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use actix::prelude::*;
use anyhow::{Context as AnyhowContext, Result};
use common::typegraph::Typegraph;
use grep::searcher::{BinaryDetection, SearcherBuilder};
use notify_debouncer_mini::notify::{INotifyWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, notify, DebounceEventResult, Debouncer};
use pathdiff::diff_paths;
use std::path::{Path, PathBuf};
use std::{sync::Arc, time::Duration};

use crate::config::Config;
use crate::deploy::actors::console::{error, info};
use crate::deploy::actors::loader::{ReloadModule, ReloadReason};
use crate::typegraph::dependency_graph::DependencyGraph;
use crate::typegraph::loader::discovery::FileFilter;

use super::console::warning;
use super::console::ConsoleActor;

pub struct WatcherActor {
    config: Arc<Config>,
    directory: Arc<Path>,
    loader: Recipient<ReloadModule>,
    console: Addr<ConsoleActor>,
    debouncer: Option<Debouncer<INotifyWatcher>>,
    dependency_graph: DependencyGraph,
    file_filter: FileFilter,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Stop;

#[derive(Message)]
#[rtype(result = "()")]
struct File(PathBuf);

#[derive(Message)]
#[rtype(result = "()")]
pub struct UpdateDependencies(pub Arc<Typegraph>);

impl Actor for WatcherActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        if let Err(e) = self.start_watcher(ctx) {
            error!(self.console, "Failed to start watcher: {}", e);
            ctx.stop();
        }
        info!(self.console, "Watcher actor started");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        let _ = self.debouncer.take();
        info!(self.console, "Watcher actor stopped");
    }
}

impl WatcherActor {
    pub fn new(
        config: Arc<Config>,
        directory: Arc<Path>,
        loader: Recipient<ReloadModule>,
        console: Addr<ConsoleActor>,
    ) -> Result<Self> {
        let file_filter = FileFilter::new(&config)?;
        Ok(Self {
            config,
            directory,
            loader,
            console,
            debouncer: None,
            dependency_graph: DependencyGraph::default(),
            file_filter,
        })
    }

    fn start_watcher(&mut self, ctx: &mut <WatcherActor as actix::Actor>::Context) -> Result<()> {
        let self_addr = ctx.address();
        let console = self.console.clone();
        let mut debouncer =
            new_debouncer(Duration::from_secs(1), move |res: DebounceEventResult| {
                let events = res.unwrap();
                for path in events.into_iter().map(|e| e.path) {
                    info!(console, "File changed: {}", path.display());
                    self_addr.do_send(File(path));
                }
            })?;
        debouncer.watcher().configure(
            notify::Config::default()
                .with_poll_interval(Duration::from_secs(1))
                .with_compare_contents(false), // TODO configurable?
        )?;

        let watcher = debouncer.watcher();
        info!(self.console, "Watching {path:?}...", path = self.directory);
        watcher
            .watch(&self.directory, RecursiveMode::Recursive)
            .with_context(|| format!("Watching {path:?}", path = self.directory))?;

        self.debouncer = Some(debouncer);

        Ok(())
    }
}

impl Handler<Stop> for WatcherActor {
    type Result = ();

    fn handle(&mut self, _msg: Stop, ctx: &mut Self::Context) -> Self::Result {
        ctx.stop();
    }
}

impl Handler<File> for WatcherActor {
    type Result = ();

    fn handle(&mut self, msg: File, _ctx: &mut Self::Context) -> Self::Result {
        if &msg.0 == self.config.path.as_ref().unwrap() {
            warning!(self.console, "Metatype configuration file changed.");
            warning!(self.console, "Reloading everything.");
            // TODO
        } else {
            let reverse_deps = self.dependency_graph.get_rdeps(&msg.0);
            if !reverse_deps.is_empty() {
                let rel_path = diff_paths(&msg.0, &self.directory).unwrap();
                info!(self.console, "File modified: {rel_path:?}; dependency of:");
                for path in reverse_deps {
                    let dependency_path = msg.0.clone();
                    let rel_path = diff_paths(&path, &self.directory).unwrap();
                    info!(
                        self.console,
                        "  -> {rel_path}",
                        rel_path = rel_path.display()
                    );
                    self.loader.do_send(ReloadModule(
                        path,
                        ReloadReason::DependencyChanged(dependency_path),
                    ));
                }
            } else {
                let mut searcher = SearcherBuilder::new()
                    .binary_detection(BinaryDetection::none())
                    .build();

                if !self.file_filter.is_excluded(&msg.0, &mut searcher) {
                    let rel_path = diff_paths(&msg.0, &self.directory).unwrap();
                    info!(self.console, "File modified: {rel_path:?}");
                    self.loader
                        .do_send(ReloadModule(msg.0, ReloadReason::FileChanged));
                }
            }
        }
    }
}

impl Handler<UpdateDependencies> for WatcherActor {
    type Result = ();

    fn handle(&mut self, msg: UpdateDependencies, _ctx: &mut Self::Context) -> Self::Result {
        self.dependency_graph.update_typegraph(&msg.0)
    }
}
