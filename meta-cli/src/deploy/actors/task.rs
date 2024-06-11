// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

//! The `TaskActor` actor manages a single deploy/serialize task.
//! It starts the task process, processes outputs on stdout and stderr,
//! then reports to `TaskManager`.
//!
//! Note: On the task process
//! - stdout is used for logging and task output; each line is prefix by
//! either one of  "debug: ", "info: ", "warn: ", "error: " for logging,
//! or "success: "/"failure: " for reporting operation result (serialization, or
//! deployment) for each typegraph with for JSON-serialized data.
//! - stderr is used for fatal errors that causes the program to exit; mainly
//! unhandled exception in JavaScript or Python

pub mod action;
mod command;
pub mod deploy;
pub mod serialize;

use self::action::{ActionFinalizeContext, ActionResult, TaskAction};
use super::console::{Console, ConsoleActor};
use super::task_manager::{self, TaskManager};
use crate::config::Config;
use crate::deploy::actors::task_io::TaskIoActor;
use crate::interlude::*;
use action::{get_typegraph_name, TaskActionGenerator};
use common::typegraph::Typegraph;
use indexmap::IndexMap;
use process_wrap::tokio::TokioChildWrapper;
use serde::Deserialize;
use std::time::Duration;
use tokio::process::Command;

pub mod message {
    use super::*;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct StartProcess(pub Command);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct RestartProcessWithOptions<A: TaskAction>(pub A::Options);

    /// wait for process termination
    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct WaitForProcess<A: TaskAction>(pub Option<A::Options>);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct Exit<A: TaskAction>(pub TaskFinishStatus<A>);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct Stop;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct Results<A: TaskAction>(pub Vec<ActionResult<A>>);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct UpdateResults<A: TaskAction>(pub Vec<ActionResult<A>>);
}

use message::*;

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
enum TaskOutput {
    Serialized(Typegraph),
    Deployed { deployed: String },
}

// TODO cli param
const TIMEOUT_ENV_NAME: &str = "LOADER_TIMEOUT_SECS";
const DEFAULT_TIMEOUT: u64 = 120;

#[derive(Debug)]
pub enum TaskFinishStatus<A: TaskAction> {
    Cancelled,
    Error,
    Finished(IndexMap<String, ActionResult<A>>),
}

pub struct TaskActor<A: TaskAction + 'static> {
    config: Arc<Config>,
    action_generator: A::Generator,
    action: A,
    process: Option<Box<dyn TokioChildWrapper>>,
    io: Option<Addr<TaskIoActor<A>>>,
    task_manager: Addr<TaskManager<A>>,
    console: Addr<ConsoleActor>,
    results: IndexMap<String, ActionResult<A>>, // for the report
    timeout_duration: Duration,
}

impl<A> TaskActor<A>
where
    A: TaskAction,
{
    pub fn new(
        config: Arc<Config>,
        action_generator: A::Generator,
        initial_action: A,
        task_manager: Addr<TaskManager<A>>,
        console: Addr<ConsoleActor>,
    ) -> Self {
        Self {
            config,
            process: None,
            io: None,
            task_manager,
            console,
            action_generator,
            action: initial_action,
            results: Default::default(),
            // TODO doc?
            timeout_duration: Duration::from_secs(
                std::env::var(TIMEOUT_ENV_NAME)
                    .map(|s| {
                        s.parse::<u64>()
                            .map_err(|_| ())
                            .and_then(|n| if n >= 1 { Ok(n) } else { Err(()) })
                            .unwrap_or_else(|_| {
                                panic!("{TIMEOUT_ENV_NAME} env value must be a positive integer")
                            })
                    })
                    .unwrap_or(DEFAULT_TIMEOUT),
            ),
        }
    }

    fn get_path(&self) -> &Path {
        &self.action.get_task_ref().path
    }

    fn get_path_owned(&self) -> Arc<Path> {
        self.action.get_task_ref().path.clone()
    }

    fn start_process(&mut self, ctx: &mut <Self as Actor>::Context) {
        let addr = ctx.address();
        let console = self.console.clone();
        let action = self.action.clone();

        let fut = async move {
            match action.get_command().await {
                Ok(cmd) => {
                    let std_cmd = cmd.as_std();
                    debug!("std command: {std_cmd:?}");
                    debug!("command: {cmd:?}");
                    addr.do_send(StartProcess(cmd));
                }
                Err(e) => {
                    console.error(e.to_string());
                    addr.do_send(Exit(TaskFinishStatus::<A>::Error));
                }
            }
        };

        ctx.spawn(fut.in_current_span().into_actor(self));
    }
}

impl<A: TaskAction + 'static> Actor for TaskActor<A> {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        self.start_process(ctx);
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        trace!("task actor stopped: {:?}", self.get_path());
    }
}

impl<A: TaskAction + 'static> Handler<StartProcess> for TaskActor<A> {
    type Result = ();

    fn handle(&mut self, StartProcess(cmd): StartProcess, ctx: &mut Context<Self>) -> Self::Result {
        use process_wrap::tokio::*;
        self.console.info(self.action.get_start_message());
        let spawn_res = TokioCommandWrap::from(cmd)
            .wrap(KillOnDrop)
            // we use sessions so that kill on drop
            // signals will get all grand-children
            .wrap(ProcessSession)
            .spawn();

        match spawn_res {
            Ok(mut child) => {
                let io_actor = TaskIoActor::init(
                    ctx.address(),
                    self.action.clone(),
                    &mut child,
                    self.console.clone(),
                );

                self.io = match io_actor {
                    Ok(io_actor) => Some(io_actor),
                    Err(e) => {
                        self.console.error(e.to_string());
                        ctx.address().do_send(Exit(TaskFinishStatus::<A>::Error));
                        return;
                    }
                };

                self.process = Some(child);

                let addr = ctx.address();
                let timeout_duration = self.timeout_duration;
                let path = self.get_path_owned();
                let console = self.console.clone();
                let fut = async move {
                    tokio::time::sleep(timeout_duration).await;
                    console.error(format!("task timed out for {:?}", path));
                    addr.do_send(Stop);
                };
                ctx.spawn(fut.in_current_span().into_actor(self));
            }
            Err(err) => {
                self.console.error(format!(
                    "failed to start task process for {:?}: {err:#}",
                    self.get_path()
                ));
                ctx.address().do_send(Exit(TaskFinishStatus::<A>::Error));
            }
        }
    }
}

impl<A: TaskAction + 'static> Handler<RestartProcessWithOptions<A>> for TaskActor<A> {
    type Result = ();

    fn handle(
        &mut self,
        RestartProcessWithOptions(options): RestartProcessWithOptions<A>,
        ctx: &mut Self::Context,
    ) -> Self::Result {
        let task_ref = self.action.get_task_ref().clone();
        self.action = self.action_generator.generate(task_ref, options);
        self.start_process(ctx);
    }
}

impl<A: TaskAction + 'static> Handler<WaitForProcess<A>> for TaskActor<A> {
    type Result = ();

    fn handle(
        &mut self,
        WaitForProcess(followup_options): WaitForProcess<A>,
        ctx: &mut Context<Self>,
    ) -> Self::Result {
        let Some(process) = self.process.take() else {
            self.console
                .error(format!("task process not found for {:?}", self.get_path()));
            ctx.address().do_send(Exit(TaskFinishStatus::<A>::Error));
            return;
        };

        let addr = ctx.address();
        let console = self.console.clone();
        let action = self.action.clone();

        let fut = async move {
            // TODO timeout?
            match Box::into_pin(process.wait_with_output()).await {
                Ok(output) => {
                    if output.status.success() {
                        if let Some(followup_options) = followup_options {
                            addr.do_send(RestartProcessWithOptions(followup_options))
                        } else {
                            // logging in Exit handler
                            addr.do_send(Exit(TaskFinishStatus::<A>::Finished(Default::default())));
                        }
                    } else {
                        console.error(action.get_error_message(&format!(
                            "process failed with code {:?}",
                            output.status.code()
                        )));
                        console.error(format!(
                            "(stderr):\n{}",
                            std::str::from_utf8(&output.stderr)
                                .context("invalid utf8 in task output (stderr)")
                                .unwrap_or_log()
                        ));
                        addr.do_send(Exit(TaskFinishStatus::<A>::Error));
                    }
                }
                Err(e) => {
                    console.error(
                        action.get_error_message(&format!("could not read process status: {e:#}")),
                    );
                    addr.do_send(Exit(TaskFinishStatus::<A>::Error));
                }
            }
        };

        ctx.spawn(fut.in_current_span().into_actor(self));
    }
}

impl<A: TaskAction + 'static> Handler<Results<A>> for TaskActor<A> {
    type Result = ();

    fn handle(&mut self, results: Results<A>, ctx: &mut Context<Self>) -> Self::Result {
        let self_addr = ctx.address();
        let action = self.action.clone();
        let finalize_ctx = ActionFinalizeContext {
            config: self.config.clone(),
            task_manager: self.task_manager.clone(),
            task: ctx.address(),
            console: self.console.clone(),
        };

        let fut = async move {
            let mut followup: Option<A::Options> = None;
            for result in &results.0 {
                if let Ok(Some(followup_opt)) = action.finalize(result, finalize_ctx.clone()).await
                {
                    let followup = followup.get_or_insert_with(Default::default);
                    followup_opt.add_to_options(followup);
                }
            }
            self_addr.do_send(message::UpdateResults(results.0));
            self_addr.do_send(WaitForProcess(followup));
        };
        ctx.spawn(fut.in_current_span().into_actor(self));
    }
}

impl<A: TaskAction + 'static> Handler<UpdateResults<A>> for TaskActor<A> {
    type Result = ();

    fn handle(&mut self, UpdateResults(results): UpdateResults<A>, _ctx: &mut Context<Self>) {
        for result in results.into_iter() {
            let tg_name = get_typegraph_name::<A>(&result);
            self.results.insert(tg_name, result);
        }
    }
}

impl<A: TaskAction + 'static> Handler<Exit<A>> for TaskActor<A> {
    type Result = ();

    fn handle(&mut self, mut message: Exit<A>, ctx: &mut Context<Self>) -> Self::Result {
        if let TaskFinishStatus::<A>::Finished(res) = &mut message.0 {
            std::mem::swap(res, &mut self.results);
        }
        self.task_manager
            .do_send(task_manager::message::TaskFinished {
                task_ref: self.action.get_task_ref().clone(),
                status: message.0,
            });
        ctx.stop();
    }
}

impl<A: TaskAction + 'static> Handler<Stop> for TaskActor<A> {
    type Result = ();

    fn handle(&mut self, _msg: Stop, _ctx: &mut Context<Self>) -> Self::Result {
        let path = self.get_path_owned();
        if let Some(process) = &mut self.process {
            self.console.warning(format!("killing task for {:?}", path));
            process.start_kill().unwrap();
        }
    }
}
