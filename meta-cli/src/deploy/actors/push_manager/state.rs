use derive_more::From;
use enum_dispatch::enum_dispatch;
use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
};
use tokio::sync::oneshot;

pub trait StateEx {
    fn add_typegraph(self, path: &Path, name: String) -> Result<State, AddTypegraphError>;
    fn remove_typegraph(
        self,
        path: &Path,
        name: String,
    ) -> Result<(State, CancelationStatus), RemoveTypegraphError>;
}

// TODO remove pub

#[derive(Debug, Default)]
pub struct ModuleStatus {
    // when some, follow-up pushes are cancelled,
    // and the sender is notified to resume loading
    pub on_cancellation_complete: Option<oneshot::Sender<()>>,
    pub active_push_count: usize,
}

#[derive(Debug)]
pub struct StateIdle;

#[derive(Debug)]
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
#[enum_dispatch(StateEx)]
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
    // TODO private
    pub fn reduce<R, E>(&mut self, action: impl FnOnce(Self) -> Result<(Self, R), E>) -> Result<R, E> {
        let old_state = std::mem::replace(self, State::default()); // temp
        let (new_state, ret) = action(old_state)?;
        *self = new_state;
        Ok(ret)
    }

    // TODO private
    pub fn reduce2<E>(&mut self, action: impl FnOnce(Self) -> Result<Self, E>) -> Result<(), E> {
        let old_state = std::mem::replace(self, State::default()); // temp
        let new_state = action(old_state)?;
        *self = new_state;
        Ok(())
    }

    pub fn add_typegraph(self, path: &Path, name: String) -> Result<Self, AddTypegraphError> {
        match self {
            Self::Idle(_) => {
                let mut typegraphs = HashSet::new();
                let mut modules = HashMap::new();
                typegraphs.insert(name);
                let module_status = ModuleStatus {
                    on_cancellation_complete: None,
                    active_push_count: 1,
                };
                modules.insert(path.to_owned(), module_status);
                Ok(StateRunning {
                    typegraphs,
                    modules,
                }
                .into())
            }

            Self::Running(StateRunning {
                mut typegraphs,
                mut modules,
            }) => {
                if !typegraphs.insert(name) {
                    // logical bug
                    return Err(AddTypegraphError::ActivePushExists(
                        StateRunning {
                            typegraphs,
                            modules,
                        }
                        .into(),
                    ));
                }

                modules.get_mut(path).unwrap().active_push_count += 1;

                Ok(StateRunning {
                    typegraphs,
                    modules,
                }
                .into())
            }

            Self::Ending(StateEnding {
                typegraphs,
                modules,
                ended_tx,
            }) => Err(AddTypegraphError::StatusEnding(
                StateEnding {
                    typegraphs,
                    modules,
                    ended_tx,
                }
                .into(),
            )),

            Self::Ended(_) => Err(AddTypegraphError::StatusEnded(Self::Ended(StateEnded))),
        }
    }

    pub fn remove_typegraph(
        self,
        path: &Path,
        name: String,
    ) -> Result<(Self, CancelationStatus), RemoveTypegraphError> {
        match self {
            Self::Idle(_) => Err(RemoveTypegraphError::StatusIdle(Self::Idle(StateIdle))),

            Self::Running(StateRunning {
                mut typegraphs,
                mut modules,
            }) => {
                if !typegraphs.remove(&name) {
                    // logical bug
                    return Err(RemoveTypegraphError::PushNotActive(
                        StateRunning {
                            typegraphs,
                            modules,
                        }
                        .into(),
                    ));
                }

                let push_count = {
                    let active_push_count = &mut modules.get_mut(path).unwrap().active_push_count;
                    *active_push_count -= 1;
                    *active_push_count
                };
                if push_count == 0 {
                    let status = modules.remove(path).unwrap();
                    let is_cancelled = if let Some(tx) = status.on_cancellation_complete {
                        tx.send(()).unwrap();
                        true
                    } else {
                        false
                    };
                    Ok((Self::Idle(StateIdle), CancelationStatus(is_cancelled)))
                } else {
                    let is_cancelled = modules
                        .get(path)
                        .unwrap()
                        .on_cancellation_complete
                        .is_some();
                    Ok((
                        StateRunning {
                            typegraphs,
                            modules,
                        }
                        .into(),
                        CancelationStatus(is_cancelled),
                    ))
                }
            }

            Self::Ending(StateEnding {
                mut typegraphs,
                mut modules,
                ended_tx,
            }) => {
                if !typegraphs.remove(&name) {
                    // logical bug
                    return Err(RemoveTypegraphError::PushNotActive(
                        StateEnding {
                            typegraphs,
                            modules,
                            ended_tx,
                        }
                        .into(),
                    ));
                }

                let push_count = {
                    let active_push_count = &mut modules.get_mut(path).unwrap().active_push_count;
                    *active_push_count -= 1;
                    *active_push_count
                };
                if push_count == 0 {
                    let status = modules.remove(path).unwrap();
                    let cancellation_status =
                        CancelationStatus(status.on_cancellation_complete.is_some());
                    // on_cancellation_complete is ignored
                    if typegraphs.is_empty() {
                        ended_tx.send(()).unwrap();
                        Ok((StateEnded.into(), cancellation_status))
                    } else {
                        Ok((
                            StateEnding {
                                typegraphs,
                                modules,
                                ended_tx,
                            }
                            .into(),
                            cancellation_status,
                        ))
                    }
                } else {
                    Ok((
                        StateEnding {
                            typegraphs,
                            modules,
                            ended_tx,
                        }
                        .into(),
                        CancelationStatus(false),
                    ))
                }
            }

            Self::Ended(_) => Err(RemoveTypegraphError::StatusEnded(Self::Ended(StateEnded))),
        }
    }
}

pub struct CancelationStatus(pub bool);

pub enum AddTypegraphError {
    ActivePushExists(State),
    StatusEnding(State),
    StatusEnded(State),
}

pub enum RemoveTypegraphError {
    PushNotActive(State),
    StatusIdle(State),
    StatusEnded(State),
}

impl StateEx for StateIdle {
    fn add_typegraph(self, path: &Path, name: String) -> Result<State, AddTypegraphError> {
        let mut typegraphs = HashSet::new();
        let mut modules = HashMap::new();
        typegraphs.insert(name);
        let module_status = ModuleStatus {
            on_cancellation_complete: None,
            active_push_count: 1,
        };
        modules.insert(path.to_owned(), module_status);
        Ok(StateRunning {
            typegraphs,
            modules,
        }
        .into())
    }

    fn remove_typegraph(
        self,
        path: &Path,
        name: String,
    ) -> Result<(State, CancelationStatus), RemoveTypegraphError> {
        Err(RemoveTypegraphError::PushNotActive(self.into()))
    }
}
