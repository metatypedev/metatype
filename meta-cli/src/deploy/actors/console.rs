// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::sync::Arc;

use actix::prelude::*;
use log::Record;

use crate::config::Config;

pub struct ConsoleActor {
    #[allow(dead_code)]
    config: Arc<Config>,
}

impl ConsoleActor {
    pub fn new(config: Arc<Config>) -> Self {
        Self { config }
    }
}

impl Actor for ConsoleActor {
    type Context = Context<Self>;

    #[cfg(debug_assertions)]
    fn started(&mut self, _ctx: &mut Context<Self>) {
        log::trace!("console actor started");
    }

    fn stopped(&mut self, _ctx: &mut Context<Self>) {
        log::trace!("console actor stopped");
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Info(pub String);

#[derive(Message)]
#[rtype(result = "()")]
pub struct Warning(pub String);

#[derive(Message)]
#[rtype(result = "()")]
pub struct Error(pub String);

#[cfg(debug_assertions)]
#[derive(Message)]
#[rtype(result = "()")]
pub struct Debug(pub String);

#[cfg(debug_assertions)]
#[derive(Message)]
#[rtype(result = "()")]
pub struct Trace(pub String);

impl Handler<Info> for ConsoleActor {
    type Result = ();

    fn handle(&mut self, msg: Info, _ctx: &mut Context<Self>) -> Self::Result {
        log::info!("{}", msg.0);
    }
}

impl Handler<Warning> for ConsoleActor {
    type Result = ();

    fn handle(&mut self, msg: Warning, _ctx: &mut Context<Self>) -> Self::Result {
        log::warn!("{}", msg.0);
    }
}

impl Handler<Error> for ConsoleActor {
    type Result = ();

    fn handle(&mut self, msg: Error, _ctx: &mut Context<Self>) -> Self::Result {
        log::error!("{}", msg.0);
    }
}

#[cfg(debug_assertions)]
impl Handler<Debug> for ConsoleActor {
    type Result = ();

    fn handle(&mut self, msg: Debug, _ctx: &mut Context<Self>) -> Self::Result {
        // log::debug!("{}", msg.0);
        eprintln!("{}", msg.0);
    }
}

#[cfg(debug_assertions)]
impl Handler<Trace> for ConsoleActor {
    type Result = ();

    fn handle(&mut self, msg: Trace, _ctx: &mut Context<Self>) -> Self::Result {
        // log::trace!("{}", msg.0);
        eprintln!("{}", msg.0);
    }
}

macro_rules! info {
    ($addr:expr, $($arg:tt)*) => {
        $addr.do_send($crate::deploy::actors::console::Info(format!($($arg)*)))
    };
}

macro_rules! warning {
    ($addr:expr, $($arg:tt)*) => {
        $addr.do_send($crate::deploy::actors::console::Warning(format!($($arg)*)))
    };
}

macro_rules! error {
    ($addr:expr, $($arg:tt)*) => {
        $addr.do_send($crate::deploy::actors::console::Error(format!($($arg)*)))
    };
}

#[cfg(debug_assertions)]
macro_rules! debug {
    ($addr:expr, $($arg:tt)*) => {
        {
            use colored::Colorize;
            let text = format!("[{level} {module_path}] {args}",
                level = log::Level::Debug,
                module_path = module_path!(),
                args = format_args!($($arg)*),
            ).dimmed();
            $addr.do_send($crate::deploy::actors::console::Debug(text.to_string()))
        }
    };
}

#[cfg(debug_assertions)]
macro_rules! trace {
    ($addr:expr, $($arg:tt)*) => {
        {
            use colored::Colorize;
            let text = format!("[{level} {module_path}] {args}",
                level = log::Level::Trace,
                module_path = module_path!(),
                args = format_args!($($arg)*),
            ).dimmed();
            $addr.do_send($crate::deploy::actors::console::Trace(text.to_string()))
        }
    };
}

#[cfg(debug_assertions)]
pub(crate) use debug;
pub(crate) use error;
pub(crate) use info;
#[cfg(debug_assertions)]
pub(crate) use trace;
pub(crate) use warning;
