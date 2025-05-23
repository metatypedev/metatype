// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{
    console::Console,
    task::{
        action::{ActionResult, TaskAction},
        TaskActor,
    },
};
use crate::deploy::actors::console::ConsoleActor;
use crate::interlude::*;
use colored::OwoColorize;
use futures::lock::Mutex;
use process_wrap::tokio::TokioChildWrapper;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::ChildStdin;

mod message {
    use super::*;
    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct OutputLine(pub String);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct TaskResult<T, E>(pub Result<T, E>);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct SendRpcResponse(pub RpcResponse);

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct Exit;
}

#[derive(Serialize, Deserialize, Debug)]
enum JsonRpcVersion {
    #[serde(rename = "2.0")]
    V2,
}

#[derive(Deserialize, Debug)]
struct RpcRequest {
    #[allow(dead_code)]
    jsonrpc: JsonRpcVersion,
    id: u32,
    #[serde(flatten)]
    call: serde_json::Value,
}

impl RpcRequest {
    fn response(&self, result: serde_json::Value) -> RpcResponse {
        RpcResponse {
            jsonrpc: JsonRpcVersion::V2,
            id: self.id,
            body: RpcBody::Ok { result },
        }
    }

    fn error(&self, message: String) -> RpcResponse {
        RpcResponse {
            jsonrpc: JsonRpcVersion::V2,
            id: self.id,
            body: RpcBody::Err {
                error: RpcError { message },
            },
        }
    }
}

#[derive(Serialize, Debug)]
struct RpcResponse {
    jsonrpc: JsonRpcVersion,
    id: u32,
    #[serde(flatten)]
    body: RpcBody,
}

#[derive(Serialize, Debug)]
#[serde(untagged)]
enum RpcBody {
    Ok { result: serde_json::Value },
    Err { error: RpcError },
}

#[derive(Serialize, Debug)]
struct RpcError {
    //code: i32,
    message: String,
}

pub(super) struct TaskIoActor<A: TaskAction + 'static> {
    stdin: Arc<Mutex<ChildStdin>>,
    action: A,
    task: Addr<TaskActor<A>>,
    console: Addr<ConsoleActor>,
    results: Vec<ActionResult<A>>,
    rpc_message_buffer: String,
}

impl<A: TaskAction + 'static> TaskIoActor<A> {
    pub fn init(
        task: Addr<TaskActor<A>>,
        action: A,
        process: &mut Box<dyn TokioChildWrapper>,
        console: Addr<ConsoleActor>,
    ) -> Result<Addr<Self>> {
        let stdin = process
            .stdin()
            .take()
            .ok_or_else(|| ferr!("could not take stdin handle from the process"))?;
        let stdout = process
            .stdout()
            .take()
            .ok_or_else(|| ferr!("could not take stdout handle from the process"))?;

        let addr = Self::create(move |ctx| {
            let actor = Self {
                stdin: Arc::new(Mutex::new(stdin)),
                action,
                task,
                console: console.clone(),
                results: vec![],
                rpc_message_buffer: String::new(),
            };

            let self_addr = ctx.address().downgrade();
            let scope = actor.get_console_scope();
            let fut = async move {
                let mut reader = BufReader::new(stdout).lines();
                loop {
                    match reader.next_line().await {
                        Ok(Some(line)) => {
                            let self_addr = self_addr.upgrade().expect(
                                "unreachable: future should have been cancelled when self dropped",
                            );
                            self_addr.do_send(message::OutputLine(line))
                        }
                        Ok(None) => {
                            break;
                        }
                        Err(err) => {
                            console.error(format!("{scope} failed to read from stdout: {err}"));
                            break;
                        }
                    }
                }
                console.debug("task i/o actor finished reading from stdout".to_string());
                let self_addr = self_addr
                    .upgrade()
                    .expect("future should have been cancelled when self dropped");
                self_addr.do_send(message::Exit);
            };

            ctx.spawn(fut.in_current_span().into_actor(&actor));

            actor
        });

        Ok(addr)
    }
}

impl<A: TaskAction + 'static> Actor for TaskIoActor<A> {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Context<Self>) {
        trace!("task i/o actor started");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        trace!("task i/o actor stopped");
    }
}

#[derive(Deserialize, Debug)]
struct RpcNotification<S, F> {
    #[allow(dead_code)]
    jsonrpc: JsonRpcVersion,
    #[serde(flatten)]
    call: RpcNotificationKind<S, F>,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "method", content = "params")]
enum RpcNotificationKind<S, F> {
    Debug { message: String },
    Info { message: String },
    Warning { message: String },
    Error { message: String },
    Success { data: S },
    Failure { data: F },
}

impl<A: TaskAction + 'static> Handler<message::OutputLine> for TaskIoActor<A> {
    type Result = ();

    fn handle(&mut self, message::OutputLine(line): message::OutputLine, ctx: &mut Context<Self>) {
        let console = &self.console;
        let scope = self.get_console_scope();

        match line.split_once(": ") {
            Some((prefix, tail)) => {
                trace!("prefix: {prefix}");
                match prefix {
                    "jsonrpc^" => {
                        self.rpc_message_buffer.push_str(tail);
                    }
                    "jsonrpc$" => {
                        self.rpc_message_buffer.push_str(tail);
                        let message = std::mem::take(&mut self.rpc_message_buffer);
                        self.handle_rpc_message(&message, ctx);
                    }

                    _ => {
                        // a log message that were not outputted with the log library
                        // on the typegraph client
                        // --> as a debug message
                        console.debug(format!("{scope}$>{line}"));
                    }
                }
            }
            None => {
                // a log message that were not outputted with the log library
                // on the typegraph client
                console.info(format!("{scope}$>{line}"));
            }
        }
    }
}

impl<A: TaskAction + 'static> TaskIoActor<A> {
    fn get_console_scope(&self) -> String {
        let path = self.action.get_task_ref().path.to_str().unwrap();
        format!("[{path}]", path = path.yellow())
    }

    fn handle_rpc_message(&mut self, message: &str, ctx: &mut Context<Self>) {
        let console = &self.console;
        let scope = self.get_console_scope();
        let message: serde_json::Value = match serde_json::from_str(message) {
            Ok(value) => value,
            Err(err) => {
                self.console
                    .error(format!("{scope} failed to parse JSON-RPC message: {err}"));
                // TODO cancel task?
                return;
            }
        };

        if message.get("id").is_some() {
            // JSON-RPC request
            match serde_json::from_value(message) {
                Ok(req) => self.handle_rpc_request(req, ctx.address(), ctx),
                Err(err) => {
                    console.error(format!(
                        "{scope} failed to validate JSON-RPC request: {err}"
                    ));
                    // TODO cancel task?
                }
            }
        } else {
            // JSON-RPC notification
            match serde_json::from_value(message) {
                Ok(notification) => self.handle_rpc_notification(notification),
                Err(err) => {
                    console.error(format!(
                        "{scope} failed to validate JSON-RPC notification: {err}"
                    ));
                    // TODO cancel task?
                }
            };
        }
    }

    fn handle_rpc_notification(
        &mut self,
        notification: RpcNotification<A::SuccessData, A::FailureData>,
    ) {
        let console = &self.console;
        let scope = self.get_console_scope();

        match notification.call {
            RpcNotificationKind::Debug { message } => {
                for line in message.lines() {
                    console.debug(format!("{scope} {line}"));
                }
            }
            RpcNotificationKind::Info { message } => {
                for line in message.lines() {
                    console.info(format!("{scope} {line}"));
                }
            }
            RpcNotificationKind::Warning { message } => {
                for line in message.lines() {
                    console.warning(format!("{scope} {line}"));
                }
            }
            RpcNotificationKind::Error { message } => {
                for line in message.lines() {
                    console.error(format!("{scope} {line}"));
                }
            }
            RpcNotificationKind::Success { data } => {
                self.results.push(Ok(data));
            }
            RpcNotificationKind::Failure { data } => {
                self.results.push(Err(data));
            }
        }
    }

    fn handle_rpc_request(&self, req: RpcRequest, self_addr: Addr<Self>, ctx: &mut Context<Self>) {
        match serde_json::from_value::<A::RpcRequest>(req.call.clone()) {
            Ok(rpc_call) => {
                let console = self.console.clone();
                let action = self.action.clone();
                let scope = self.get_console_scope();

                let fut = async move {
                    match action.handle_rpc_request(rpc_call).await {
                        Ok(response) => match response {
                            super::task::action::RpcResponse::Value(value) => {
                                self_addr.do_send(message::SendRpcResponse(req.response(value)))
                            }
                            super::task::action::RpcResponse::TaskResult(result) => {
                                // Wait for deploy to finish before exiting the process
                                // in order to prevent task from hanging out
                                // TODO: Send some actual data?
                                let response = req.response(serde_json::Value::Null);
                                self_addr.do_send(message::SendRpcResponse(response));
                                self_addr.do_send(message::TaskResult(result))
                            }
                        },
                        Err(err) => {
                            // Handle error on the client side
                            console.debug(format!(
                                "{scope} failed to handle jsonrpc call {req:?}: {err}"
                            ));
                            self_addr.do_send(message::SendRpcResponse(req.error(err.to_string())));
                            // TODO fail task?
                        }
                    }
                };
                ctx.spawn(fut.in_current_span().into_actor(self));
            }
            Err(err) => {
                self.console.error(format!(
                    "[{path}] invalid jsonrpc request {req:?}: {err}",
                    path = self.get_console_scope(),
                ));
            }
        }
    }
}

impl<A: TaskAction + 'static> Handler<message::SendRpcResponse> for TaskIoActor<A> {
    type Result = ();

    fn handle(
        &mut self,
        message::SendRpcResponse(response): message::SendRpcResponse,
        ctx: &mut Context<Self>,
    ) {
        match serde_json::to_string(&response) {
            Ok(mut response) => {
                let stdin = self.stdin.clone();
                response.push('\n');
                let fut = async move {
                    let mut stdin = stdin.lock().await;
                    stdin
                        .write_all(response.as_bytes())
                        .await
                        .expect("could not write rpc response to stdin");
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

impl<A: TaskAction + 'static> Handler<message::TaskResult<A::SuccessData, A::FailureData>>
    for TaskIoActor<A>
{
    type Result = ();

    fn handle(
        &mut self,
        message: message::TaskResult<A::SuccessData, A::FailureData>,
        _ctx: &mut Context<Self>,
    ) {
        self.results.push(message.0);
    }
}

impl<A: TaskAction + 'static> Handler<message::Exit> for TaskIoActor<A> {
    type Result = ();

    fn handle(&mut self, _message: message::Exit, ctx: &mut Context<Self>) {
        self.task
            .do_send(super::task::message::Results(std::mem::take(
                &mut self.results,
            )));
        ctx.stop();
    }
}
