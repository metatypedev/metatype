// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::console::Console;
use super::task::action::TaskAction;
use super::task_manager::{self, TaskGenerator, TaskManager, TaskReason};
use crate::config::Config;
use crate::deploy::actors::console::ConsoleActor;
use crate::deploy::actors::task::deploy::TypegraphData;
use crate::deploy::push::pusher::RetryManager;
use crate::interlude::*;
use crate::typegraph::dependency_graph::DependencyGraph;
use crate::typegraph::loader::discovery::FileFilter;
use notify_debouncer_mini::notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, notify, DebounceEventResult, Debouncer};
use pathdiff::diff_paths;
use std::path::{Path, PathBuf};
use std::{sync::Arc, time::Duration};

pub mod message {
    use super::*;

    // TODO remove
    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct Stop;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct File(pub PathBuf);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct UpdateDependencies(pub TypegraphData);

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

pub struct WatcherActor<A: TaskAction + 'static> {
    // TODO config path only
    config: Arc<Config>,
    directory: Arc<Path>,
    task_generator: TaskGenerator,
    task_manager: Addr<TaskManager<A>>,
    console: Addr<ConsoleActor>,
    debouncer: Option<Debouncer<RecommendedWatcher>>,
    dependency_graph: DependencyGraph,
    file_filter: FileFilter,
}

impl<A: TaskAction> Actor for WatcherActor<A> {
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

impl<A: TaskAction> WatcherActor<A> {
    pub fn new(
        config: Arc<Config>,
        directory: Arc<Path>,
        task_generator: TaskGenerator,
        task_manager: Addr<TaskManager<A>>,
        console: Addr<ConsoleActor>,
    ) -> Result<Self> {
        let file_filter = FileFilter::new(&config)?;
        Ok(Self {
            config,
            directory,
            task_generator,
            task_manager,
            console,
            debouncer: None,
            dependency_graph: DependencyGraph::default(),
            file_filter,
        })
    }

    fn start_watcher(
        &mut self,
        ctx: &mut <WatcherActor<A> as actix::Actor>::Context,
    ) -> Result<()> {
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

impl<A: TaskAction + 'static> Handler<Stop> for WatcherActor<A> {
    type Result = ();

    fn handle(&mut self, _msg: Stop, ctx: &mut Self::Context) -> Self::Result {
        ctx.stop();
    }
}

impl<A: TaskAction + 'static> Handler<File> for WatcherActor<A> {
    type Result = ();

    fn handle(&mut self, msg: File, ctx: &mut Self::Context) -> Self::Result {
        let path = msg.0;
        if &path == self.config.path.as_ref().unwrap() {
            self.console
                .warning("metatype configuration file changed".to_owned());
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
                        task_ref: self.task_generator.generate(path.into(), 0),
                        reason: TaskReason::DependencyChanged(dependency_path),
                    });
                }
            } else if path.try_exists().unwrap() {
                if !self.file_filter.is_excluded(&path) {
                    let rel_path = diff_paths(&path, &self.directory).unwrap();
                    self.console.info(format!("File modified: {rel_path:?}"));

                    RetryManager::clear_counter(&path);
                    self.task_manager.do_send(task_manager::message::AddTask {
                        task_ref: self.task_generator.generate(rel_path.into(), 0),
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

impl<A: TaskAction + 'static> Handler<UpdateDependencies> for WatcherActor<A> {
    type Result = ();

    fn handle(&mut self, msg: UpdateDependencies, _ctx: &mut Self::Context) -> Self::Result {
        let TypegraphData { path, value, .. } = msg.0;
        self.dependency_graph.update_typegraph(path, &value)
    }
}

impl<A: TaskAction + 'static> Handler<RemoveTypegraph> for WatcherActor<A> {
    type Result = ();

    fn handle(&mut self, msg: RemoveTypegraph, _ctx: &mut Self::Context) -> Self::Result {
        self.dependency_graph.remove_typegraph_at(&msg.0)
    }
}
