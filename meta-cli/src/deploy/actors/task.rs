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
//!
//! TODO: manage the communication between the CLI and the task process in the `TaskActor`.

pub mod action;
mod command;
pub mod deploy;
pub mod serialize;

use self::action::{ActionFinalizeContext, ActionResult, TaskAction};
use super::console::{Console, ConsoleActor};
use super::task_manager::{self, TaskManager};
use crate::com::server::get_instance_port;
use crate::config::Config;
use crate::interlude::*;
use color_eyre::owo_colors::OwoColorize;
use common::typegraph::Typegraph;
use futures::lock::Mutex;
use process_wrap::tokio::TokioChildWrapper;
use serde::Deserialize;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader, Lines};
use tokio::process::{ChildStdin, ChildStdout, Command};

pub mod message {
    use super::*;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct StartProcess(pub Command);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct ProcessOutput {
        pub stdout: ChildStdout,
    }

    /// wait for process termination
    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct CheckProcessStatus;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct CollectOutput<A: TaskAction>(pub ActionResult<A>);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct Exit<A: TaskAction>(pub TaskFinishStatus<A>);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub struct Stop;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct Rpc(pub RpcRequest);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct SendRpcResponse(pub RpcResponse);
}

use message::*;

#[derive(Debug)]
pub struct TaskConfig {
    base_dir: Arc<Path>,
    instance_port: u16,
}

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
enum TaskOutput {
    Serialized(Typegraph),
    Deployed { deployed: String },
}

// TODO cli param
const TIMEOUT_ENV_NAME: &str = "LOADER_TIMEOUT_SECS";
const DEFAULT_TIMEOUT: u64 = 120;

impl TaskConfig {
    pub fn init(base_dir: Arc<Path>) -> Self {
        Self {
            base_dir,
            instance_port: get_instance_port(),
        }
    }
}

#[derive(Debug)]
pub enum TaskFinishStatus<A: TaskAction> {
    Cancelled,
    Error,
    Finished(Vec<ActionResult<A>>),
}

pub struct TaskActor<A: TaskAction + 'static> {
    config: Arc<Config>,
    action: A,
    process: Option<Box<dyn TokioChildWrapper>>,
    // TODO separate i/o actor, and write queue instead of mutex
    process_stdin: Option<Arc<Mutex<ChildStdin>>>,
    task_manager: Addr<TaskManager<A>>,
    console: Addr<ConsoleActor>,
    collected_output: Vec<Result<A::SuccessData, A::FailureData>>,
    timeout_duration: Duration,
    followup_task: A::Followup,
}

impl<A> TaskActor<A>
where
    A: TaskAction,
{
    pub fn new(
        config: Arc<Config>,
        action: A,
        task_manager: Addr<TaskManager<A>>,
        console: Addr<ConsoleActor>,
    ) -> Self {
        Self {
            config,
            process: None,
            process_stdin: None,
            task_manager,
            console,
            action,
            collected_output: Default::default(),
            // TODO doc?
            timeout_duration: Duration::from_secs(
                std::env::var(TIMEOUT_ENV_NAME)
                    .map(|s| {
                        s.parse::<u64>()
                            .map_err(|_| ())
                            .and_then(|n| if n >= 1 { Ok(n) } else { Err(()) })
                            .expect(&format!(
                                "{TIMEOUT_ENV_NAME} env value must be a positive integer"
                            ))
                    })
                    .unwrap_or(DEFAULT_TIMEOUT),
            ),
            followup_task: Default::default(),
        }
    }

    fn get_path(&self) -> &Path {
        &self.action.get_task_ref().path
    }

    fn get_path_owned(&self) -> Arc<Path> {
        self.action.get_task_ref().path.clone()
    }
}

impl<A: TaskAction + 'static> Actor for TaskActor<A> {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        let addr = ctx.address();
        let console = self.console.clone();
        let action = self.action.clone();

        let fut = async move {
            match action.get_command().await {
                Ok(cmd) => {
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
                let stdout = child.stdout().take();
                let Some(stdout) = stdout else {
                    self.console.error(
                        self.action
                            .get_error_message("could not read output from process"),
                    );
                    ctx.address().do_send(Exit(TaskFinishStatus::<A>::Error));
                    return;
                };

                ctx.address().do_send(ProcessOutput { stdout });

                self.process_stdin = Some(Arc::new(Mutex::new(child.stdin().take().unwrap())));
                self.process = Some(child);

                let addr = ctx.address();
                let timeout_duration = self.timeout_duration.clone();
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

impl<A: TaskAction + 'static> Handler<ProcessOutput> for TaskActor<A> {
    type Result = ();

    fn handle(
        &mut self,
        ProcessOutput { stdout }: ProcessOutput,
        ctx: &mut Context<Self>,
    ) -> Self::Result {
        let addr = ctx.address();
        let console = self.console.clone();
        let path = self.get_path_owned();

        let fut = async move {
            let reader = BufReader::new(stdout).lines();
            if let Err(e) =
                Self::loop_output_lines(reader, addr.clone(), console.clone(), path.clone()).await
            {
                console.error(format!(
                    "failed to read process output on {:?}: {e:#}",
                    path
                ));
                addr.do_send(Exit(TaskFinishStatus::<A>::Error))
            } else {
                // end of stdout
                addr.do_send(CheckProcessStatus);
            }
        };
        ctx.spawn(fut.in_current_span().into_actor(self));
    }
}

impl<A: TaskAction + 'static> Handler<CheckProcessStatus> for TaskActor<A> {
    type Result = ();

    fn handle(&mut self, _msg: CheckProcessStatus, ctx: &mut Context<Self>) -> Self::Result {
        let Some(process) = self.process.take() else {
            self.console
                .error(format!("task process not found for {:?}", self.get_path()));
            ctx.address().do_send(Exit(TaskFinishStatus::<A>::Error));
            return ();
        };

        let addr = ctx.address();
        let console = self.console.clone();
        let path = self.get_path_owned();
        let action = self.action.clone();

        let fut = async move {
            match Box::into_pin(process.wait_with_output()).await {
                Ok(output) => {
                    if output.status.success() {
                        // logging in Exit handler
                        addr.do_send(Exit(TaskFinishStatus::<A>::Finished(Default::default())));
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

#[derive(Clone, Copy)]
enum OutputLevel {
    Debug,
    Info,
    Warning,
    Error,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "method", content = "params")]
#[serde(rename_all = "camelCase")]
enum RpcCall {
    QueryGlobalConfig,
    QueryTypegraphConfig { typegraph: String },
}

#[derive(Serialize, Deserialize, Debug)]
enum JsonRpcVersion {
    #[serde(rename = "2.0")]
    V2,
}

#[derive(Deserialize, Debug)]
struct RpcRequest {
    jsonrpc: JsonRpcVersion,
    id: u32,
    #[serde(flatten)]
    call: RpcCall,
}

impl RpcRequest {
    fn response(&self, result: serde_json::Value) -> RpcResponse {
        RpcResponse {
            jsonrpc: JsonRpcVersion::V2,
            id: self.id,
            result,
        }
    }
}

#[derive(Serialize, Debug)]
struct RpcResponse {
    jsonrpc: JsonRpcVersion,
    id: u32,
    result: serde_json::Value,
}

impl<A: TaskAction + 'static> TaskActor<A> {
    async fn loop_output_lines(
        mut reader: Lines<BufReader<ChildStdout>>,
        addr: Addr<TaskActor<A>>,
        console: Addr<ConsoleActor>,
        path: Arc<Path>,
    ) -> tokio::io::Result<()> {
        let mut latest_level = OutputLevel::Info;

        let scope = format!("[{path}]", path = path.display());
        let scope = scope.yellow();

        while let Some(line) = reader.next_line().await? {
            if let Some(debug) = line.strip_prefix("debug: ") {
                console.debug(format!("{scope} {debug}"));
                latest_level = OutputLevel::Debug;
                continue;
            }

            if let Some(info) = line.strip_prefix("info: ") {
                console.info(format!("{scope} {info}"));
                latest_level = OutputLevel::Info;
                continue;
            }

            if let Some(warn) = line.strip_prefix("warning: ") {
                console.warning(format!("{scope} {warn}"));
                latest_level = OutputLevel::Warning;
                continue;
            }

            if let Some(error) = line.strip_prefix("error: ") {
                console.error(format!("{scope} {error}"));
                latest_level = OutputLevel::Error;
                continue;
            }

            if let Some(data_json) = line.strip_prefix("success: ") {
                let data: A::SuccessData = serde_json::from_str(data_json)?;
                addr.do_send(CollectOutput(Ok(data)));
                continue;
            }

            if let Some(data_json) = line.strip_prefix("failure: ") {
                let data: A::FailureData = serde_json::from_str(data_json)?;
                addr.do_send(CollectOutput(Err(data)));
                continue;
            }

            if let Some(req) = line.strip_prefix("jsonrpc: ") {
                let req: RpcRequest = serde_json::from_str(req)?;
                addr.do_send(message::Rpc(req));
                continue;
            }

            match latest_level {
                OutputLevel::Debug => {
                    console.debug(format!("{scope}>{line}"));
                }
                OutputLevel::Info => {
                    console.info(format!("{scope}>{line}"));
                }
                OutputLevel::Warning => {
                    console.warning(format!("{scope}>{line}"));
                }
                OutputLevel::Error => {
                    console.error(format!("{scope}>{line}"));
                }
            }
        }
        Ok(())
    }
}

impl<A: TaskAction + 'static> Handler<CollectOutput<A>> for TaskActor<A> {
    type Result = ();

    fn handle(&mut self, message: CollectOutput<A>, ctx: &mut Context<Self>) -> Self::Result {
        self.action.finalize(
            &message.0,
            ActionFinalizeContext {
                config: self.config.clone(),
                task_manager: self.task_manager.clone(),
                task: ctx.address(),
                console: self.console.clone(),
            },
        );
        self.collected_output.push(message.0);
    }
}

impl<A: TaskAction + 'static> Handler<Exit<A>> for TaskActor<A> {
    type Result = ();

    fn handle(&mut self, mut message: Exit<A>, ctx: &mut Context<Self>) -> Self::Result {
        if let TaskFinishStatus::<A>::Finished(res) = &mut message.0 {
            std::mem::swap(res, &mut self.collected_output);
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

    fn handle(&mut self, _msg: Stop, ctx: &mut Context<Self>) -> Self::Result {
        let path = self.get_path_owned();
        if let Some(process) = &mut self.process {
            self.console.warning(format!("killing task for {:?}", path));
            process.start_kill().unwrap();
        }
    }
}

impl<A: TaskAction + 'static> Handler<Rpc> for TaskActor<A> {
    type Result = ();

    fn handle(&mut self, Rpc(req): Rpc, ctx: &mut Context<Self>) -> Self::Result {
        let addr = ctx.address();
        match &req.call {
            RpcCall::QueryGlobalConfig => {
                let config = self.action.get_global_config();
                let response = req.response(config);
                self.send_rpc_response(response, ctx);
                // addr.do_send(SendRpcResponse(response));
            }
            RpcCall::QueryTypegraphConfig { typegraph } => {
                let config = self.action.get_typegraph_config(typegraph);
                let response = req.response(config);
                self.send_rpc_response(response, ctx);
                // addr.do_send(SendRpcResponse(response));
            }
        }
    }
}

impl<A: TaskAction> TaskActor<A> {
    fn send_rpc_response(&mut self, response: RpcResponse, ctx: &mut Context<Self>) {
        match serde_json::to_string(&response) {
            Ok(response) => {
                let stdin = self.process_stdin.clone().unwrap();
                let fut = async move {
                    let mut stdin = stdin.lock().await;
                    stdin
                        .write_all(response.as_bytes())
                        .await
                        .expect("could not write rpc response to process stdin");
                    stdin
                        .write_all(b"\n")
                        .await
                        .expect("could not write newline to process stdin");
                };

                ctx.spawn(fut.in_current_span().into_actor(self));
            }
            Err(e) => {
                self.console
                    .error(format!("could not serialize rpc response {e}"));
            }
        }
    }
}

// impl<A: TaskAction + 'static> Handler<message::SendRpcResponse> for TaskActor<A> {
//     type Result = ();
//
//     fn handle(
//         &mut self,
//         SendRpcResponse(response): SendRpcResponse,
//         _ctx: &mut Context<Self>,
//     ) -> Self::Result {
//         {
//             let response_id = response.id;
//             match serde_json::to_string(&response) {
//                 Ok(response) => {
//                     let stdin = self.process_stdin.clone().unwrap_or_log();
//                     let console = self.console.clone();
//                     let fut = async move {
//                         let stdin = stdin.lock().await;
//                         console.debug(format!("sending rpc response #{response_id}"));
//                         stdin
//                             .write_all(response.as_bytes())
//                             .await
//                             .expect("could not write rpc response to process stdin");
//                         stdin
//                             .write_all(b"\n")
//                             .await
//                             .expect("could not write newline to process stdin");
//                     };
//                 }
//                 Err(e) => {
//                     self.console
//                         .error(format!("could not serialize rpc response {e}"));
//                 }
//             }
//         };
//     }
// }
