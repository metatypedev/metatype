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
struct Info(pub String);

#[derive(Message)]
#[rtype(result = "()")]
struct Warning(pub String);

#[derive(Message)]
#[rtype(result = "()")]
struct Error(pub String);

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

pub trait Console {
    fn info(&self, msg: String);
    fn warning(&self, msg: String);
    fn error(&self, msg: String);
}

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
}
