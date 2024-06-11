// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::console::{Console, ConsoleActor};
use super::discovery::DiscoveryActor;
use super::task::action::{TaskAction, TaskActionGenerator};
use super::task::{self, TaskActor, TaskFinishStatus};
use super::watcher::WatcherActor;
use crate::{config::Config, interlude::*};
use futures::channel::oneshot;
use indexmap::IndexMap;
use std::collections::VecDeque;
use std::sync::atomic::{AtomicUsize, Ordering};

pub mod report;
pub use report::Report;

pub mod message {
    use super::*;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct AddTask {
        pub task_ref: TaskRef,
        pub reason: TaskReason,
    }

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct NextTask;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct TaskFinished<A: TaskAction + 'static> {
        pub task_ref: TaskRef,
        pub status: TaskFinishStatus<A>,
    }

    /// manual stop (by CTRL-C handler)
    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct Stop;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct ForceStop;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct Restart;
}

use message::*;

pub enum StopSchedule {
    Manual,
    Automatic,
}

enum Status {
    Default,
    Stopping, // waiting for active tasks to finish; cancel pending tasks
}

#[derive(Clone, Debug)]
pub enum StopReason {
    Natural,
    Restart,
    Manual,
    ManualForced,
    Error,
}

#[derive(Clone, Debug)]
pub struct TaskGenerator {
    next_task_id: Arc<AtomicUsize>,
}

impl TaskGenerator {
    pub fn generate(&self, path: Arc<Path>, retry_no: usize) -> TaskRef {
        TaskRef {
            path,
            id: TaskId(self.next_task_id.fetch_add(1, Ordering::Relaxed)),
            retry_no,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TaskId(usize);

#[derive(Clone, Debug)]
pub struct TaskRef {
    pub path: Arc<Path>,
    pub id: TaskId,
    pub retry_no: usize,
}

// enum RetryStatus {
//     Pending,
//     Cancelled,
// }

pub enum TaskSource {
    Static(Vec<PathBuf>),
    Discovery(Arc<Path>),
    DiscoveryAndWatch(Arc<Path>),
}

pub struct TaskManager<A: TaskAction + 'static> {
    init_params: TaskManagerInit<A>,
    task_generator: TaskGenerator,
    active_tasks: HashMap<Arc<Path>, Addr<TaskActor<A>>>,
    task_queue: VecDeque<TaskRef>,
    pending_retries: HashMap<Arc<Path>, TaskId>,
    report_tx: Option<oneshot::Sender<Report<A>>>,
    stop_reason: Option<StopReason>,
    reports: IndexMap<Arc<Path>, TaskFinishStatus<A>>,
    watcher_addr: Option<Addr<WatcherActor<A>>>,
    console: Addr<ConsoleActor>,
}

pub struct TaskManagerInit<A: TaskAction> {
    config: Arc<Config>,
    action_generator: A::Generator,
    max_parallel_tasks: usize,
    max_retry_count: usize,
    console: Addr<ConsoleActor>,
    task_source: TaskSource,
}

impl<A: TaskAction + 'static> TaskManagerInit<A> {
    pub fn new(
        config: Arc<Config>,
        action_generator: A::Generator,
        console: Addr<ConsoleActor>,
        task_source: TaskSource,
    ) -> Self {
        Self {
            config,
            action_generator,
            max_parallel_tasks: num_cpus::get(),
            max_retry_count: 0,
            console,
            task_source,
        }
    }

    pub fn max_parallel_tasks(mut self, max_parallel_tasks: usize) -> Self {
        self.max_parallel_tasks = max_parallel_tasks;
        self
    }

    pub fn max_retry_count(mut self, max_retry_count: usize) -> Self {
        self.max_retry_count = max_retry_count;
        self
    }

    pub async fn run(self) -> Report<A> {
        let (report_tx, report_rx) = oneshot::channel();

        TaskManager::<A>::create(move |ctx| {
            let addr = ctx.address();

            {
                let addr = addr.downgrade();
                ctrlc::set_handler(move || {
                    debug!("CTRL-C handler");
                    if let Some(addr) = addr.upgrade() {
                        addr.do_send(Stop);
                    } else {
                        std::process::exit(1);
                    }
                })
                .unwrap_or_log();
            }

            let task_generator = TaskGenerator {
                next_task_id: Arc::new(AtomicUsize::new(1)),
            };

            let watcher_addr = self.start_source(addr, task_generator.clone());

            let console = self.console.clone();
            let task_manager = TaskManager::<A> {
                init_params: self,
                task_generator,
                active_tasks: Default::default(),
                task_queue: Default::default(),
                pending_retries: Default::default(),
                report_tx: Some(report_tx),
                stop_reason: None,
                reports: IndexMap::new(),
                watcher_addr,
                console,
            };

            task_manager
        });

        report_rx.await.expect("task manager has been dropped")
    }

    fn start_source(
        &self,
        addr: Addr<TaskManager<A>>,
        task_generator: TaskGenerator,
    ) -> Option<Addr<WatcherActor<A>>> {
        match &self.task_source {
            TaskSource::Static(paths) => {
                for path in paths {
                    addr.do_send(AddTask {
                        task_ref: task_generator.generate(path.clone().into(), 0),
                        reason: TaskReason::User,
                    });
                }
                None
            }
            TaskSource::Discovery(path) => {
                DiscoveryActor::new(
                    self.config.clone(),
                    task_generator.clone(),
                    addr.clone(),
                    self.console.clone(),
                    path.clone(),
                )
                .start();
                None
            }
            TaskSource::DiscoveryAndWatch(path) => {
                let path: Arc<Path> = path.clone();
                DiscoveryActor::new(
                    self.config.clone(),
                    task_generator.clone(),
                    addr.clone(),
                    self.console.clone(),
                    path.clone(),
                )
                .start();

                let watcher = WatcherActor::new(
                    self.config.clone(),
                    path,
                    task_generator.clone(),
                    addr.clone(),
                    self.console.clone(),
                )
                .unwrap_or_log()
                .start();

                Some(watcher)
            }
        }
    }
}

#[derive(Debug)]
pub enum TaskReason {
    User, // single file specified with the -f option
    Discovery,
    FileChanged,
    // FileCreated,
    DependencyChanged(PathBuf),
    Retry(usize),
}

impl<A: TaskAction + 'static> Actor for TaskManager<A> {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        // this cannot mess with the interactive deployment
        self.console.debug("started task manager".to_string());
    }

    fn stopping(&mut self, ctx: &mut Self::Context) -> Running {
        match &self.stop_reason {
            Some(reason) => {
                if matches!(reason, StopReason::Restart) {
                    self.init_params
                        .start_source(ctx.address(), self.task_generator.clone());
                    Running::Continue
                } else {
                    Running::Stop
                }
            }
            None => Running::Continue,
        }
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        trace!("TaskManager stopped");
        // send report
        let report = Report {
            stop_reason: self
                .stop_reason
                .take()
                .ok_or_else(|| eyre::eyre!("missing stop reason in task manager"))
                .unwrap_or_log(),
            entries: std::mem::take(&mut self.reports)
                .into_iter()
                .map(|(path, status)| report::ReportEntry { path, status })
                .collect(),
        };

        self.report_tx.take().unwrap().send(report).unwrap_or_log();
    }
}

impl<A: TaskAction + 'static> Handler<AddTask> for TaskManager<A> {
    type Result = ();

    fn handle(&mut self, msg: AddTask, ctx: &mut Context<Self>) -> Self::Result {
        let pending_retry_id = self.pending_retries.remove(&msg.task_ref.path);

        if msg.task_ref.retry_no > 0 {
            if let Some(retry_task_id) = pending_retry_id {
                if retry_task_id != msg.task_ref.id {
                    self.console.warning(
                        "invalid state: different task id for retry; cancelling".to_string(),
                    );
                    return;
                }
                // ok
            } else {
                self.console
                    .warning("invalid state: unregistered retry; cancelling".to_string());
                return;
            }
        } else {
            // retry cancelled
        }

        self.task_queue.push_back(msg.task_ref);
        ctx.address().do_send(message::NextTask);
    }
}

impl<A: TaskAction + 'static> Handler<NextTask> for TaskManager<A> {
    type Result = ();

    fn handle(&mut self, _msg: NextTask, ctx: &mut Context<Self>) -> Self::Result {
        if self.active_tasks.len() >= self.init_params.max_parallel_tasks {
            // too busy
            return;
        }

        let Some(task) = self.task_queue.pop_front() else {
            // nothing to do
            return;
        };

        if let Some(stop_reason) = &self.stop_reason {
            match stop_reason {
                StopReason::Natural => {}
                _ => {
                    self.console
                        .warning(format!("task cancelled for {:?}", task.path));
                    return;
                }
            }
        }

        let action = self.init_params.action_generator.generate(
            task.clone(),
            Default::default(), // TODO
        );
        let task_addr = TaskActor::new(
            self.init_params.config.clone(),
            self.init_params.action_generator.clone(),
            action,
            ctx.address(),
            self.console.clone(),
        )
        .start();

        self.active_tasks.insert(task.path, task_addr);
    }
}

impl<A: TaskAction + 'static> Handler<TaskFinished<A>> for TaskManager<A> {
    type Result = ();

    fn handle(&mut self, message: TaskFinished<A>, ctx: &mut Context<Self>) -> Self::Result {
        self.console.debug("task finished".to_string());
        self.active_tasks.remove(&message.task_ref.path);
        ctx.address().do_send(NextTask);

        let mut next_retry_no = None;
        match &message.status {
            TaskFinishStatus::Error => {
                if message.task_ref.retry_no < self.init_params.max_retry_count {
                    next_retry_no = Some(message.task_ref.retry_no + 1);
                }
            }
            TaskFinishStatus::Finished(results) => {
                // TODO partial retry - if multiple typegraphs in a single file
                if results.iter().any(|r| matches!(r.1, Err(_))) {
                    next_retry_no = Some(message.task_ref.retry_no + 1);
                }
            }
            _ => {}
        };

        self.reports
            .insert(message.task_ref.path.clone(), message.status);

        if let Some(_next_retry_no) = next_retry_no {
            todo!("not implemented");
        }

        // TODO check queue??
        if self.active_tasks.is_empty() {
            if self.watcher_addr.is_none() && self.pending_retries.is_empty() {
                // no watcher, auto stop when all tasks finished
                self.console.debug("all tasks finished".to_string());
                self.stop_reason = Some(StopReason::Natural);
                ctx.stop();
            } else {
                match self.stop_reason {
                    Some(StopReason::Manual) => {
                        ctx.stop();
                    }
                    _ => {}
                }
            }
        }
    }
}

impl<A: TaskAction + 'static> Handler<Stop> for TaskManager<A> {
    type Result = ();

    fn handle(&mut self, _msg: Stop, ctx: &mut Context<Self>) -> Self::Result {
        if let Some(watcher) = &self.watcher_addr {
            watcher.do_send(super::watcher::message::Stop);
        }
        match self.stop_reason.clone() {
            Some(reason) => match reason {
                StopReason::Natural | StopReason::Restart => {
                    self.stop_reason = Some(StopReason::Manual);
                }
                StopReason::Manual => {
                    self.stop_reason = Some(StopReason::ManualForced);
                    ctx.address().do_send(ForceStop);
                }
                StopReason::ManualForced => {
                    self.console
                        .warning("stopping the task manager".to_string());
                    ctx.stop();
                }
                StopReason::Error => {}
            },
            None => {
                self.stop_reason = Some(StopReason::Manual);
            }
        }
    }
}

impl<A: TaskAction + 'static> Handler<ForceStop> for TaskManager<A> {
    type Result = ();

    fn handle(&mut self, _msg: ForceStop, _ctx: &mut Context<Self>) -> Self::Result {
        self.console
            .warning("force stopping active tasks".to_string());
        for (_, addr) in self.active_tasks.iter() {
            addr.do_send(task::message::Stop)
        }
    }
}

impl<A: TaskAction + 'static> Handler<Restart> for TaskManager<A> {
    type Result = ();

    fn handle(&mut self, _msg: Restart, ctx: &mut Context<Self>) -> Self::Result {
        self.stop_reason = Some(StopReason::Restart);
        ctx.address().do_send(ForceStop);
    }
}
