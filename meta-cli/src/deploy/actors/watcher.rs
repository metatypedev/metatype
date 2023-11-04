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
use tokio::sync::mpsc;

use crate::config::Config;
use crate::deploy::actors::console::{error, info};
use crate::typegraph::dependency_graph::DependencyGraph;
use crate::typegraph::loader::discovery::FileFilter;

use super::console::ConsoleActor;

#[derive(Debug)]
pub enum Event {
    DependencyChanged {
        typegraph_module: PathBuf,
        dependency_path: PathBuf,
    },
    TypegraphModuleChanged {
        typegraph_module: PathBuf,
    },
    TypegraphModuleDeleted {
        typegraph_module: PathBuf,
    },
    ConfigChanged,
}

pub struct WatcherActor {
    config: Arc<Config>,
    directory: Arc<Path>,
    event_tx: mpsc::UnboundedSender<Event>,
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

#[derive(Message)]
#[rtype(result = "()")]
pub struct RemoveTypegraph(pub PathBuf);

impl Actor for WatcherActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        if let Err(e) = self.start_watcher(ctx) {
            error!(self.console, "Failed to start watcher: {}", e);
            ctx.stop();
        }
        log::trace!("Watcher actor started");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        let _ = self.debouncer.take();
        log::trace!("Watcher actor stopped");
    }
}

impl WatcherActor {
    pub fn new(
        config: Arc<Config>,
        directory: Arc<Path>,
        event_tx: mpsc::UnboundedSender<Event>,
        console: Addr<ConsoleActor>,
    ) -> Result<Self> {
        let file_filter = FileFilter::new(&config)?;
        Ok(Self {
            config,
            directory,
            event_tx,
            console,
            debouncer: None,
            dependency_graph: DependencyGraph::default(),
            file_filter,
        })
    }

    fn start_watcher(&mut self, ctx: &mut <WatcherActor as actix::Actor>::Context) -> Result<()> {
        let self_addr = ctx.address();
        let mut debouncer =
            new_debouncer(Duration::from_secs(1), move |res: DebounceEventResult| {
                let events = res.unwrap();
                for path in events.into_iter().map(|e| e.path) {
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
        let path = msg.0;
        if &path == self.config.path.as_ref().unwrap() {
            self.event_tx.send(Event::ConfigChanged).unwrap();
        } else {
            let reverse_deps = self.dependency_graph.get_rdeps(&path);
            if !reverse_deps.is_empty() {
                let rel_path = diff_paths(&path, &self.directory).unwrap();
                info!(self.console, "File modified: {rel_path:?}; dependency of:");
                for path in reverse_deps {
                    let dependency_path = path.clone();
                    let rel_path = diff_paths(&path, &self.directory).unwrap();
                    info!(
                        self.console,
                        "  -> {rel_path}",
                        rel_path = rel_path.display()
                    );

                    if let Err(e) = self.event_tx.send(Event::DependencyChanged {
                        typegraph_module: path,
                        dependency_path,
                    }) {
                        error!(self.console, "Failed to send event: {}", e);
                        // panic??
                    }
                }
            } else if path.try_exists().unwrap() {
                let mut searcher = SearcherBuilder::new()
                    .binary_detection(BinaryDetection::none())
                    .build();

                if !self.file_filter.is_excluded(&path, &mut searcher) {
                    let rel_path = diff_paths(&path, &self.directory).unwrap();
                    info!(self.console, "File modified: {rel_path:?}");
                    if let Err(e) = self.event_tx.send(Event::TypegraphModuleChanged {
                        typegraph_module: path,
                    }) {
                        error!(self.console, "Failed to send event: {}", e);
                        // panic??
                    }
                }
            } else if let Err(e) = self.event_tx.send(Event::TypegraphModuleDeleted {
                typegraph_module: path,
            }) {
                error!(self.console, "Failed to send event: {}", e);
                // panic??
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

impl Handler<RemoveTypegraph> for WatcherActor {
    type Result = ();

    fn handle(&mut self, msg: RemoveTypegraph, _ctx: &mut Self::Context) -> Self::Result {
        self.dependency_graph.remove_typegraph_at(&msg.0)
    }
}
