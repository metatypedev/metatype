// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::console::Console;
use super::task::deploy::DeployAction;
use super::task_manager::{self, TaskManager, TaskReason};
use crate::config::Config;
use crate::deploy::actors::console::ConsoleActor;
use crate::deploy::push::pusher::RetryManager;
use crate::interlude::*;
use crate::typegraph::dependency_graph::DependencyGraph;
use crate::typegraph::loader::discovery::FileFilter;
use common::typegraph::Typegraph;
use grep::searcher::{BinaryDetection, SearcherBuilder};
use notify_debouncer_mini::notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, notify, DebounceEventResult, Debouncer};
use pathdiff::diff_paths;
use std::path::{Path, PathBuf};
use std::{sync::Arc, time::Duration};

pub mod message {
    use super::*;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct Stop;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct File(pub PathBuf);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct UpdateDependencies(pub Arc<Typegraph>);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct RemoveTypegraph(pub PathBuf);
}

use message::*;

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
    // TODO config path only
    config: Arc<Config>,
    directory: Arc<Path>,
    task_manager: Addr<TaskManager<DeployAction>>,
    console: Addr<ConsoleActor>,
    debouncer: Option<Debouncer<RecommendedWatcher>>,
    dependency_graph: DependencyGraph,
    file_filter: FileFilter,
}

impl Actor for WatcherActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        if let Err(e) = self.start_watcher(ctx) {
            self.console
                .error(format!("Failed to start watcher: {}", e));
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
        task_manager: Addr<TaskManager<DeployAction>>,
        console: Addr<ConsoleActor>,
    ) -> Result<Self> {
        let file_filter = FileFilter::new(&config)?;
        Ok(Self {
            config,
            directory,
            task_manager,
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
        self.console
            .info(format!("Watching {path:?}...", path = self.directory));
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

    fn handle(&mut self, msg: File, ctx: &mut Self::Context) -> Self::Result {
        let path = msg.0;
        if &path == self.config.path.as_ref().unwrap() {
            self.console
                .warning("metatype configuration filie changed".to_owned());
            self.console
                .warning("reloading all the typegraphs".to_owned());
            self.task_manager.do_send(task_manager::message::Restart);
            ctx.stop();
        } else {
            let reverse_deps = self.dependency_graph.get_rdeps(&path);
            if !reverse_deps.is_empty() {
                let rel_path = diff_paths(&path, &self.directory).unwrap();
                self.console
                    .info(format!("File modified: {rel_path:?}; dependency of:"));
                for path in reverse_deps {
                    let dependency_path = path.clone();
                    let rel_path = diff_paths(&path, &self.directory).unwrap();
                    self.console
                        .info(format!("  -> {rel_path}", rel_path = rel_path.display()));

                    RetryManager::clear_counter(&path);
                    self.task_manager.do_send(task_manager::message::AddTask {
                        path: path.into(),
                        reason: TaskReason::DependencyChanged(dependency_path),
                    });
                }
            } else if path.try_exists().unwrap() {
                let mut searcher = SearcherBuilder::new()
                    .binary_detection(BinaryDetection::none())
                    .build();

                if !self.file_filter.is_excluded(&path, &mut searcher) {
                    let rel_path = diff_paths(&path, &self.directory).unwrap();
                    self.console.info(format!("File modified: {rel_path:?}"));

                    RetryManager::clear_counter(&path);
                    self.task_manager.do_send(task_manager::message::AddTask {
                        path: path.into(),
                        reason: TaskReason::FileChanged,
                    });
                }
            } else {
                RetryManager::clear_counter(&path);
                // TODO method call
                ctx.address().do_send(RemoveTypegraph(path.clone()));

                // TODO delete typegraph in typegate
                // TODO cancel any eventual active deployment task
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
