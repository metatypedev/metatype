// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::sync::Arc;

use actix::prelude::*;

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

pub(crate) use error;
pub(crate) use info;
pub(crate) use warning;
