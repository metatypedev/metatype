// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod input;

use std::io::BufRead;
use std::sync::Arc;

use actix::prelude::*;
use tokio::sync::oneshot;

use crate::config::Config;

enum Mode {
    Input {
        output_buffer: Vec<Box<dyn OutputMessage + 'static>>,
        input_tx: oneshot::Sender<String>,
    },
    Output,
}

pub struct ConsoleActor {
    #[allow(dead_code)]
    config: Arc<Config>,
    mode: Mode,
}

impl ConsoleActor {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            config,
            mode: Mode::Output,
        }
    }

    fn handle_output(&mut self, output: impl OutputMessage + 'static) {
        match self.mode {
            Mode::Input {
                ref mut output_buffer,
                ..
            } => {
                output_buffer.push(Box::new(output));
            }
            Mode::Output => {
                output.send();
            }
        }
    }
}

impl Actor for ConsoleActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Context<Self>) {
        log::trace!("ConsoleActor started.");
        let console = ctx.address();

        std::thread::spawn(move || {
            let mut stdin = std::io::stdin().lock();

            loop {
                let mut input = String::new();
                stdin.read_line(&mut input).unwrap();
                console.do_send(ConsoleInputLine(input));
            }
        });
    }

    fn stopped(&mut self, _ctx: &mut Context<Self>) {
        log::trace!("ConsoleActor stopped.");
    }
}

#[derive(Message)]
#[rtype(result = "()")]
struct Info(pub String);

#[derive(Message)]
#[rtype(result = "()")]
struct Warning(pub String);

#[derive(Message)]
#[rtype(result = "()")]
struct Error(pub String);

trait OutputMessage {
    fn send(&self);
}

impl OutputMessage for Info {
    fn send(&self) {
        log::info!("{}", self.0);
    }
}

impl OutputMessage for Warning {
    fn send(&self) {
        log::warn!("{}", self.0);
    }
}

impl OutputMessage for Error {
    fn send(&self) {
        log::error!("{}", self.0);
    }
}

impl Handler<Info> for ConsoleActor {
    type Result = ();

    fn handle(&mut self, msg: Info, _ctx: &mut Context<Self>) -> Self::Result {
        self.handle_output(msg);
    }
}

impl Handler<Warning> for ConsoleActor {
    type Result = ();

    fn handle(&mut self, msg: Warning, _ctx: &mut Context<Self>) -> Self::Result {
        self.handle_output(msg);
    }
}

impl Handler<Error> for ConsoleActor {
    type Result = ();

    fn handle(&mut self, msg: Error, _ctx: &mut Context<Self>) -> Self::Result {
        self.handle_output(msg);
    }
}

#[derive(Message)]
#[rtype(result = "()")]
struct StartInput(oneshot::Sender<String>);

impl Handler<StartInput> for ConsoleActor {
    type Result = ();

    fn handle(&mut self, msg: StartInput, _ctx: &mut Context<Self>) -> Self::Result {
        let StartInput(tx) = msg;
        self.mode = Mode::Input {
            output_buffer: Vec::new(),
            input_tx: tx,
        };
    }
}

#[derive(Message)]
#[rtype(result = "()")]
struct ConsoleInputLine(String);

impl Handler<ConsoleInputLine> for ConsoleActor {
    type Result = ();

    fn handle(&mut self, msg: ConsoleInputLine, _ctx: &mut Context<Self>) -> Self::Result {
        if let Mode::Input { input_tx, .. } = std::mem::replace(&mut self.mode, Mode::Output) {
            input_tx.send(msg.0).unwrap();
        } else {
            // discard line
        }
    }
}

#[async_trait::async_trait]
pub trait Console {
    fn info(&self, msg: String);
    fn warning(&self, msg: String);
    fn error(&self, msg: String);
    async fn read_line(&self) -> String;
}

#[async_trait::async_trait]
impl Console for Addr<ConsoleActor> {
    fn info(&self, msg: String) {
        self.do_send(Info(msg));
    }

    fn warning(&self, msg: String) {
        self.do_send(Warning(msg));
    }

    fn error(&self, msg: String) {
        self.do_send(Error(msg));
    }

    async fn read_line(&self) -> String {
        let (tx, rx) = oneshot::channel();
        self.do_send(StartInput(tx));
        rx.await.unwrap()
    }
}
