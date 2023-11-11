// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::format;
use std::{collections::HashMap, path::Path, sync::Arc};

use actix::prelude::*;
use common::typegraph::Typegraph;
use tokio::sync::oneshot;

use super::console::{Console, ConsoleActor};
use super::pusher::{Push, PusherActor};

#[derive(Debug, Default)]
struct PushStatus {
    // when true, follow-up pushes are cancelled
    cancelled: bool,
}

#[derive(Debug)]
enum State {
    Idle,
    Running {
        // path -> [tg_name -> status]
        active: HashMap<Arc<Path>, Vec<(String, PushStatus)>>,
    },
    Ending {
        // path -> [tg_name -> status]
        active: HashMap<Arc<Path>, Vec<(String, PushStatus)>>,
        ended_rx: oneshot::Receiver<()>,
    },
    Ended,
}

pub struct PushManagerActor {
    console: Addr<ConsoleActor>,
    pusher: Addr<PusherActor>,
    state: State,
}

impl PushManagerActor {
    fn reduce(&mut self, action: impl FnOnce(State) -> State) {
        let old_state = std::mem::replace(&mut self.state, State::Idle); // temp
        let new_state = action(old_state);
        self.state = new_state;
    }
}

impl Actor for PushManagerActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        log::trace!("PushManagerActor started");
        // self.state = State::Idle;
        // self.pusher.do_send(super::pusher::Init);
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        log::trace!("PushManagerActor stopped");
    }
}

impl Handler<Push> for PushManagerActor {
    type Result = ();

    fn handle(&mut self, push: Push, _ctx: &mut Self::Context) -> Self::Result {
        let console = self.console.clone();
        let pusher = self.pusher.clone();

        self.reduce(move |state| {
            let tg = &push.typegraph;
            let tg_name = tg.name().unwrap();
            match state {
                    State::Idle => {
                        let mut active = HashMap::new();
                        let path = tg.path.clone().unwrap();
                        active.insert(path, vec![(tg_name, PushStatus::default())]);
                        pusher.do_send(push);
                        State::Running { active }
                    }

                    State::Running { mut active } => {
                        let path = tg.path.clone().unwrap();
                        active
                            .entry(path)
                            .or_default()
                            .push((tg_name, PushStatus::default()));
                        pusher.do_send(push);
                        State::Running { active }
                    }

                    State::Ending { active, ended_rx } => {
                        console.warning(format!(
                            "Attempt to push typegraph {:?} while PushManager is in 'stopping' state. Ignoring.",
                            tg_name
                        ));
                        State::Ending { active, ended_rx }
                    }

                    State::Ended => {
                        console.warning(format!(
                            "Attempt to push typegraph {:?} while PushManager is in 'stopped' state. Ignoring.",
                            tg_name
                        ));
                        State::Ended
                    }
                }
        });
    }
}
