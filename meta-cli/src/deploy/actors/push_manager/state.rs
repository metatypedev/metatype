// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{anyhow, Result};
use derive_more::From;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use tokio::sync::oneshot;

// trait Action<S> {
//     type Result;
//     fn reduce(self, state: S) -> (S, Self::Result);
// }

#[derive(Debug, Default)]
pub struct ModuleStatus {
    // when some, follow-up pushes are cancelled,
    // and the sender is notified to resume loading
    pub on_cancellation_complete: Option<oneshot::Sender<()>>,
    pub active_push_count: usize,
}

#[derive(Debug)]
pub struct StateIdle;

#[derive(Debug, Default)]
pub struct StateRunning {
    // typegraph names
    pub typegraphs: HashSet<String>,
    pub modules: HashMap<PathBuf, ModuleStatus>,
}

#[derive(Debug)]
pub struct StateEnding {
    // typegraph names
    pub typegraphs: HashSet<String>,
    pub modules: HashMap<PathBuf, ModuleStatus>,
    pub ended_tx: oneshot::Sender<()>,
}

#[derive(Debug)]
pub struct StateEnded;

#[derive(Debug, From)]
pub enum State {
    Idle(StateIdle),
    Running(StateRunning),
    Ending(StateEnding),
    Ended(StateEnded),
}

impl Default for State {
    fn default() -> Self {
        Self::Idle(StateIdle)
    }
}

impl State {
    pub fn reduce<A: Action>(&mut self, action: A) -> A::Result {
        let state = std::mem::take(self);
        let (state, result) = action.reduce(state);
        *self = state;
        result
    }

    pub fn add_typegraph(
        &mut self,
        path: PathBuf,
        name: String,
    ) -> Result<bool, AddTypegraphError> {
        self.reduce(AddTypegraph { path, name })
    }

    pub fn remove_typegraph(
        &mut self,
        path: PathBuf,
        name: String,
    ) -> Result<CancelationStatus, RemoveTypegraphError> {
        self.reduce(RemoveTypegraph { path, name })
    }
}

pub trait Action: Sized {
    type Result;

    fn reduce_idle(self, state: StateIdle) -> (State, Self::Result);
    fn reduce_running(self, state: StateRunning) -> (State, Self::Result);
    fn reduce_ending(self, state: StateEnding) -> (State, Self::Result);
    fn reduce_ended(self, state: StateEnded) -> (State, Self::Result);

    fn reduce(self, state: State) -> (State, Self::Result) {
        match state {
            State::Idle(state) => self.reduce_idle(state),
            State::Running(state) => self.reduce_running(state),
            State::Ending(state) => self.reduce_ending(state),
            State::Ended(state) => self.reduce_ended(state),
        }
    }
}

pub enum AddTypegraphError {
    ActivePushExists,
    StatusEnding,
    StatusEnded,
}

struct AddTypegraph {
    path: PathBuf,
    name: String,
}

impl Action for AddTypegraph {
    type Result = Result<bool, AddTypegraphError>;

    fn reduce_idle(self, _state: StateIdle) -> (State, Self::Result) {
        let mut state = StateRunning::default();
        state.typegraphs.insert(self.name);
        let module_status = ModuleStatus {
            active_push_count: 1,
            ..Default::default()
        };
        state.modules.insert(self.path, module_status);

        (state.into(), Ok(true))
    }

    fn reduce_running(self, mut state: StateRunning) -> (State, Self::Result) {
        if !state.typegraphs.insert(self.name) {
            // logical bug?
            return (state.into(), Err(AddTypegraphError::ActivePushExists));
        }

        state
            .modules
            .entry(self.path)
            .or_default()
            .active_push_count += 1;

        (state.into(), Ok(true))
    }

    fn reduce_ending(self, state: StateEnding) -> (State, Self::Result) {
        (state.into(), Err(AddTypegraphError::StatusEnding))
    }

    fn reduce_ended(self, state: StateEnded) -> (State, Self::Result) {
        (state.into(), Err(AddTypegraphError::StatusEnded))
    }
}

pub enum RemoveTypegraphError {
    PushNotActive,
    StatusIdle,
    StatusEnded,
}

pub struct CancelationStatus(pub bool);

struct RemoveTypegraph {
    path: PathBuf,
    name: String,
}

impl Action for RemoveTypegraph {
    type Result = Result<CancelationStatus, RemoveTypegraphError>;

    fn reduce_idle(self, state: StateIdle) -> (State, Self::Result) {
        (state.into(), Err(RemoveTypegraphError::StatusIdle))
    }

    fn reduce_running(self, mut state: StateRunning) -> (State, Self::Result) {
        if !state.typegraphs.remove(&self.name) {
            // logical bug?
            return (state.into(), Err(RemoveTypegraphError::PushNotActive));
        }

        let mut state = state;
        let push_count = {
            let push_count = &mut state.modules.get_mut(&self.path).unwrap().active_push_count;
            *push_count -= 1;
            *push_count
        };

        if push_count == 0 {
            let status = state.modules.remove(&self.path).unwrap();
            let state = if state.modules.is_empty() {
                StateIdle.into()
            } else {
                state.into()
            };

            match status.on_cancellation_complete {
                Some(tx) => {
                    tx.send(()).unwrap();
                    (state, Ok(CancelationStatus(true)))
                }
                None => (state, Ok(CancelationStatus(false))),
            }
        } else {
            let is_cancelled = state
                .modules
                .get(&self.path)
                .unwrap()
                .on_cancellation_complete
                .is_some();
            (state.into(), Ok(CancelationStatus(is_cancelled)))
        }
    }

    fn reduce_ending(self, mut state: StateEnding) -> (State, Self::Result) {
        if !state.typegraphs.remove(&self.name) {
            // logical bug?
            return (state.into(), Err(RemoveTypegraphError::PushNotActive));
        }

        let push_count = {
            let push_count = &mut state.modules.get_mut(&self.path).unwrap().active_push_count;
            *push_count -= 1;
            *push_count
        };

        if push_count == 0 {
            let status = state.modules.remove(&self.path).unwrap();
            let state: State = if state.modules.is_empty() {
                state.ended_tx.send(()).unwrap();
                StateEnded.into()
            } else {
                state.into()
            };

            match status.on_cancellation_complete {
                Some(_tx) => {
                    // on_cancellation_complete is ignored
                    (state, Ok(CancelationStatus(true)))
                }
                None => (state, Ok(CancelationStatus(false))),
            }
        } else {
            let is_cancelled = state
                .modules
                .get(&self.path)
                .unwrap()
                .on_cancellation_complete
                .is_some();
            (state.into(), Ok(CancelationStatus(is_cancelled)))
        }
    }

    fn reduce_ended(self, state: StateEnded) -> (State, Self::Result) {
        (state.into(), Err(RemoveTypegraphError::StatusEnded))
    }
}

impl Action for super::Stop {
    type Result = Result<()>;

    fn reduce_idle(self, _state: StateIdle) -> (State, Self::Result) {
        self.tx.send(()).unwrap();
        (StateEnded.into(), Ok(()))
    }

    fn reduce_running(self, state: StateRunning) -> (State, Self::Result) {
        (
            StateEnding {
                typegraphs: state.typegraphs,
                modules: state.modules,
                ended_tx: self.tx,
            }
            .into(),
            Ok(()),
        )
    }

    fn reduce_ending(self, state: StateEnding) -> (State, Self::Result) {
        (state.into(), Err(anyhow!("already stopping")))
    }

    fn reduce_ended(self, state: StateEnded) -> (State, Self::Result) {
        (state.into(), Err(anyhow!("already stopped")))
    }
}

impl Action for super::CancelAllFromModule {
    type Result = ();

    fn reduce_idle(self, state: StateIdle) -> (State, Self::Result) {
        // TODO cancel pending retries
        self.tx.send(()).unwrap();
        (state.into(), ())
    }

    fn reduce_running(self, mut state: StateRunning) -> (State, Self::Result) {
        if let Some(status) = state.modules.get_mut(&self.path) {
            if status.on_cancellation_complete.is_some() {
                panic!(
                    "on_cancellation_complete is already set: concurrent cancelations not allowed"
                );
            } else {
                status.on_cancellation_complete = Some(self.tx);
            }
        } // logical bug?

        (state.into(), ())
    }

    fn reduce_ending(self, mut state: StateEnding) -> (State, Self::Result) {
        // TODO warning
        if let Some(status) = state.modules.get_mut(&self.path) {
            if status.on_cancellation_complete.is_some() {
                panic!(
                    "on_cancellation_complete is already set: concurrent cancelations not allowed"
                );
            } else {
                status.on_cancellation_complete = Some(self.tx);
            }
        }

        (state.into(), ())
    }

    fn reduce_ended(self, state: StateEnded) -> (State, Self::Result) {
        // TODO warning
        self.tx.send(()).unwrap();
        (state.into(), ())
    }
}
