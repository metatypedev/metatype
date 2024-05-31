// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashSet;

use futures::channel::oneshot;
use indexmap::IndexMap;
use tokio::sync::{OwnedSemaphorePermit, Semaphore};

use crate::{config::Config, interlude::*};

use super::{
    console::{Console, ConsoleActor},
    task::{
        self,
        action::{TaskAction, TaskActionGenerator},
        TaskActor, TaskFinishStatus,
    },
};

pub mod report;
pub use report::Report;

pub mod message {
    use super::*;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct AddTask {
        pub path: Arc<Path>,
        pub reason: TaskReason,
    }

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct StartTask {
        pub path: Arc<Path>,
        pub permit: OwnedSemaphorePermit,
    }

    #[derive(Message)]
    #[rtype(result = "()")]
    pub enum UpdateTaskStatus<A: TaskAction + 'static> {
        Started {
            path: Arc<Path>,
            addr: Addr<TaskActor<A>>,
        },
        Finished {
            path: Arc<Path>,
            // for report
            status: TaskFinishStatus<A>,
        },
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

pub struct TaskManager<A: TaskAction + 'static> {
    config: Arc<Config>,
    action_generator: A::Generator,
    active_tasks: HashMap<Arc<Path>, Addr<TaskActor<A>>>,
    pending_tasks: HashSet<Arc<Path>>,
    permits: Arc<Semaphore>,
    report_tx: Option<oneshot::Sender<Report<A>>>,
    stop_reason: Option<StopReason>,
    reports: IndexMap<Arc<Path>, TaskFinishStatus<A>>,
    console: Addr<ConsoleActor>,
}

impl<A: TaskAction> TaskManager<A> {
    pub fn new(
        config: Arc<Config>,
        action_generator: A::Generator,
        max_parallel_tasks: usize,
        report_tx: oneshot::Sender<Report<A>>,
        console: Addr<ConsoleActor>,
    ) -> Self {
        Self {
            config,
            action_generator,
            active_tasks: Default::default(),
            pending_tasks: Default::default(),
            permits: Semaphore::new(max_parallel_tasks).into(),
            report_tx: Some(report_tx),
            stop_reason: None,
            reports: Default::default(),
            console,
        }
    }

    pub fn auto_stop(mut self) -> Self {
        self.stop_reason = Some(StopReason::Natural);
        self
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

        debug!("sending report: {:?}", report);
        self.report_tx.take().unwrap().send(report).unwrap_or_log();
    }
}

impl<A: TaskAction + 'static> Handler<AddTask> for TaskManager<A> {
    type Result = ();

    fn handle(&mut self, msg: AddTask, ctx: &mut Context<Self>) -> Self::Result {
        match &msg.reason {
            TaskReason::User => {}
            TaskReason::Discovery => {
                self.console.info(format!(
                    "discovered typegraph definition module {:?}",
                    msg.path
                ));
            }
            TaskReason::FileChanged => {
                self.console
                    .info(format!("file changed {:?}, reloading", msg.path));
            }
            TaskReason::DependencyChanged(dep) => {
                self.console.info(format!(
                    "dependency changed {:?}, reloading {:?}",
                    dep, msg.path
                ));
            }
            TaskReason::Retry(_) => {
                // TODO retry no?
                self.console.info(format!("retrying {:?}", msg.path));
            }
        }

        self.pending_tasks.insert(msg.path.clone());

        let path = msg.path.clone();
        let permits = self.permits.clone();
        let addr = ctx.address();

        let fut = async move {
            let permit = permits.acquire_owned().await.unwrap_or_log();
            addr.do_send(StartTask { path, permit });
        };

        ctx.spawn(fut.in_current_span().into_actor(self));
    }
}

impl<A: TaskAction + 'static> Handler<StartTask> for TaskManager<A> {
    type Result = ();

    fn handle(&mut self, message: StartTask, ctx: &mut Context<Self>) -> Self::Result {
        if let Some(stop_reason) = &self.stop_reason {
            match stop_reason {
                StopReason::Natural => {}
                _ => {
                    self.console
                        .warning(format!("task cancelled for {:?}", message.path));
                    return;
                }
            }
        }
        let action = self
            .action_generator
            .generate(message.path.clone(), message.permit);
        let path = action.get_path_owned();
        let task_addr = TaskActor::new(
            self.config.clone(),
            action,
            ctx.address(),
            self.console.clone(),
        )
        .start();
        self.pending_tasks.remove(&path);
        self.active_tasks.insert(path.clone(), task_addr);
    }
}

impl<A: TaskAction + 'static> Handler<UpdateTaskStatus<A>> for TaskManager<A> {
    type Result = ();

    fn handle(&mut self, message: UpdateTaskStatus<A>, ctx: &mut Context<Self>) -> Self::Result {
        match message {
            UpdateTaskStatus::Started { .. } => {
                // TODO remove - unused
            }
            UpdateTaskStatus::Finished {
                path: typegraph_path,
                status,
            } => {
                self.active_tasks.remove(&typegraph_path);
                self.reports.insert(typegraph_path.clone(), status);
                if self.active_tasks.is_empty() {
                    match self.stop_reason {
                        Some(StopReason::Natural | StopReason::Manual) => {
                            self.console.debug("all tasks finished".to_string());

                            ctx.stop();
                        }
                        _ => {}
                    }
                }
            }
        }
    }
}

impl<A: TaskAction + 'static> Handler<Stop> for TaskManager<A> {
    type Result = ();

    fn handle(&mut self, _msg: Stop, ctx: &mut Context<Self>) -> Self::Result {
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

    fn handle(&mut self, _msg: ForceStop, ctx: &mut Context<Self>) -> Self::Result {
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
