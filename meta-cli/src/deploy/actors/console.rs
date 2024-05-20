// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod input;

use crate::interlude::*;

use std::io::BufRead;

use actix::prelude::*;
use tokio::sync::oneshot;

use crate::config::Config;

enum Mode {
    Input {
        output_buffer: Vec<Box<dyn OutputMessage + 'static>>,
    },
    Output,
}

pub struct ConsoleActor {
    #[allow(dead_code)]
    config: Arc<Config>,
    mode: Mode,
    input_tx: std::sync::mpsc::Sender<oneshot::Sender<String>>,
}

impl ConsoleActor {
    pub fn new(config: Arc<Config>) -> Self {
        let (input_tx, input_rx) = std::sync::mpsc::channel();

        Self::create_input_thread(input_rx);

        Self {
            config,
            mode: Mode::Output,
            input_tx,
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

    fn create_input_thread(rx: std::sync::mpsc::Receiver<oneshot::Sender<String>>) {
        std::thread::spawn(move || {
            let mut stdin = std::io::stdin().lock();

            while let Ok(tx) = rx.recv() {
                let mut input = String::new();
                stdin.read_line(&mut input).unwrap();
                tx.send(input).unwrap();
            }

            log::trace!("Input thread stopped.");
        });
    }
}

impl Actor for ConsoleActor {
    type Context = Context<Self>;
}

#[derive(Message)]
#[rtype(result = "()")]
struct Debug(pub String);

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

impl OutputMessage for Debug {
    fn send(&self) {
        log::debug!("{}", self.0);
    }
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

impl<T> Handler<T> for ConsoleActor
where
    T: OutputMessage + Sized + actix::Message<Result = ()> + 'static,
{
    type Result = ();

    fn handle(&mut self, msg: T, _ctx: &mut Context<Self>) -> Self::Result {
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
        };
        self.input_tx.send(tx).unwrap();
    }
}

#[derive(Message)]
#[rtype(result = "()")]
struct EndInput;

impl Handler<EndInput> for ConsoleActor {
    type Result = ();

    fn handle(&mut self, _msg: EndInput, ctx: &mut Context<Self>) -> Self::Result {
        match std::mem::replace(&mut self.mode, Mode::Output) {
            Mode::Input { output_buffer } => {
                for output in output_buffer.into_iter() {
                    output.send();
                }
            }
            Mode::Output => {
                ctx.address()
                    .error("EndInput received while not in input mode.".to_string());
            }
        }
    }
}

#[async_trait::async_trait]
pub trait Console {
    fn debug(&self, msg: String);
    fn info(&self, msg: String);
    fn warning(&self, msg: String);
    fn error(&self, msg: String);
    async fn read_line(&self) -> String;
}

#[async_trait::async_trait]
impl Console for Addr<ConsoleActor> {
    fn debug(&self, msg: String) {
        self.do_send(Debug(msg));
    }

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
        let line = rx.await.unwrap();
        self.do_send(EndInput);
        line
    }
}
