// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::PathBuf;
use std::sync::Arc;

use colored::Colorize;

use actix::prelude::*;
use anyhow::Result;
use serde::Deserialize;

use super::console::input::ConfirmHandler;
use crate::deploy::push::migration_resolution::{ForceReset, ManualResolution};
use crate::typegraph::loader::TypegraphInfos;

use super::console::{Console, ConsoleActor};
use super::push_manager::{PushFinished, PushManagerActor};

#[derive(Clone, Debug)]
struct Retry {
    num: u32,
    max: u32,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    Info,
    Warning,
    Error,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case", tag = "type", content = "text")]
pub enum MessageEntry {
    Info(String),
    Warning(String),
    Error(String),
}

#[derive(Deserialize, Debug)]
pub struct Migrations {
    pub runtime: String,
    pub migrations: String,
}

pub struct PusherActor {
    console: Addr<ConsoleActor>,
    push_manager: Addr<PushManagerActor>,
}

impl PusherActor {
    pub fn new(console: Addr<ConsoleActor>, push_manager: Addr<PushManagerActor>) -> Self {
        Self {
            console,
            push_manager,
        }
    }

    pub fn print_messages(&self, tg_name: &str, messages: &[MessageEntry]) {
        let name = tg_name.blue();
        for msg in messages.iter() {
            match msg {
                MessageEntry::Info(txt) => {
                    self.console.info(format!("[{name}] {txt}"));
                }
                MessageEntry::Warning(txt) => {
                    self.console.warning(format!("[{name}] {txt}"));
                }
                MessageEntry::Error(txt) => {
                    self.console.error(format!("[{name}] {txt}"));
                }
            }
        }
    }

    async fn push(push: Push) -> Result<PushResult, Error> {
        // TODO: retries do not work as expected
        // reason: the loader allows preparing the response, push takes the results from that

        // mental notes:

        // serialize => Loader [ok]

        // deploy => discovery == LoadModule(tg_path) ==> Loader runs tg_path ==> Push [works with previous impl]
        // this model works with the current approach if the gate is guaranteed to be always ready (no retries needed)

        // deploy => discovery == PushModule(tg_path) ==> Push may re-run the tg through Loader as much as we want [current goal]

        // A better approach would be to send a load here THEN retrieve the result
        // 1. pass the loader on the constructor to the push actor
        // 2.

        let response = push
            .typegraph
            .get_response_or_fail()
            .map_err(Error::Other)?;
        let res = response.as_push_result().map_err(Error::Response)?;

        PushResult::from_raw(res, push).map_err(Error::Response)
    }

    fn handle_error(
        push: Push,
        error: Error,
        console: Addr<ConsoleActor>,
        push_manager: Addr<PushManagerActor>,
    ) {
        match error {
            Error::Response(e) => {
                console.error(format!("Failed to push typegraph:\n{e}"));
                push_manager.do_send(PushFinished::new(push, false).schedule_retry());
            }
            Error::Other(e) => {
                console.error(format!("Unexpected error: {e}"));
                push_manager.do_send(PushFinished::new(push, false));
            }
        }
    }
}

#[derive(Message, Clone, Debug)]
#[rtype(result = "()")]
pub struct Push {
    pub typegraph: Arc<TypegraphInfos>,
    // pub created_at: Instant,
    retry: Option<Retry>,
}

impl Push {
    pub fn new(typegraph: Arc<TypegraphInfos>) -> Self {
        Self {
            typegraph,
            retry: None,
        }
    }

    pub fn retry(self, max: u32) -> Option<Self> {
        let retry_num = self.retry.map(|r| r.num + 1).unwrap_or(1);
        (retry_num <= max).then_some(Self {
            retry: Some(Retry {
                num: retry_num,
                max,
            }),
            typegraph: self.typegraph,
        })
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct CancelPush(pub PathBuf);

#[derive(Deserialize, Debug)]
#[serde(tag = "reason")]
enum PushFailure {
    Unknown(GenericPushFailure),
    DatabaseResetRequired(DatabaseResetRequired),
    NullConstraintViolation(NullConstraintViolation),
}

#[derive(Message, Debug)]
#[rtype(result = "()")]
pub struct PushResult {
    push: Push,
    name: String,
    messages: Vec<MessageEntry>,
    // migrations: Vec<Migrations>,
    failure: Option<PushFailure>,
    original_name: Option<String>,
}

// TODO: proxied through the each typegraph
impl PushResult {
    fn from_raw(raw: PushResultRaw, push: Push) -> Result<Self> {
        let failure = match raw.failure {
            Some(failure) => Some(serde_json::from_str(&failure)?),
            None => None,
        };

        Ok(Self {
            push,
            name: raw.name,
            messages: raw.messages,
            // migrations: raw.migrations,
            failure,
            original_name: None,
        })
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PushResultRaw {
    pub name: String,
    pub messages: Vec<MessageEntry>,
    pub migrations: Vec<Migrations>,
    pub failure: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct DatabaseResetRequired {
    message: String,
    runtime_name: String,
}

#[derive(Message)]
#[rtype(result = "()")]
struct DatabaseReset {
    push: Push,
    name: String,
    failure: DatabaseResetRequired,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NullConstraintViolation {
    message: String,
    runtime_name: String,
    column: String,
    migration_name: String,
    is_new_column: bool,
    table: String,
}

#[derive(Message)]
#[rtype(result = "()")]
struct ResolveNullConstraintViolation {
    push: Push,
    failure: NullConstraintViolation,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GenericPushFailure {
    message: String,
}

#[derive(Message, Debug)]
#[rtype(result = "Result<()>")]
enum Error {
    Response(anyhow::Error),
    Other(anyhow::Error),
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Stop;

impl Actor for PusherActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        log::trace!("PusherActor started");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        log::trace!("PusherActor stopped");
    }
}

impl Handler<Push> for PusherActor {
    type Result = ();

    fn handle(&mut self, push: Push, ctx: &mut Self::Context) {
        let self_addr = ctx.address();
        let console = self.console.clone();
        let push_manager = self.push_manager.clone();

        Arbiter::current().spawn(async move {
            let retry = if let Some(retry) = &push.retry {
                format!(" (retry {}/{})", retry.num, retry.max).dimmed()
            } else {
                "".dimmed()
            };

            let name = push.typegraph.name().unwrap();
            let name_colored = push.typegraph.name().unwrap().cyan();
            let file_name = push.typegraph.path.display().to_string().dimmed();

            console.info(format!(
                "Pushing typegraph {name_colored}{retry} (from '{file_name}')"
            ));

            match Self::push(push.clone()).await {
                Ok(mut res) => {
                    res.original_name = Some(name.clone());
                    self_addr.do_send(res);
                }
                Err(e) => {
                    Self::handle_error(push, e, console, push_manager);
                }
            }
        });
    }
}

impl Handler<PushResult> for PusherActor {
    type Result = ();

    fn handle(&mut self, res: PushResult, ctx: &mut Self::Context) -> Self::Result {
        let name = res.name.clone();
        self.print_messages(&name, &res.messages);

        // let migdir = self
        //     .config
        //     .prisma_migrations_dir(res.original_name.as_ref().unwrap());

        // for migrations in res.migrations.into_iter() {
        //     let dest = migdir.join(&migrations.runtime);
        //     // TODO async??
        //     if let Err(e) = common::archive::unpack(&dest, Some(migrations.migrations)) {
        //         self.console.error(format!(
        //             "Error while unpacking migrations into {:?}",
        //             diff_paths(&dest, &self.base_dir)
        //         ));
        //         self.console.error(format!("{e:?}"));
        //     } else {
        //         self.console.info(format!(
        //             "Successfully unpacked migrations for {name}/{} at {:?}!",
        //             migrations.runtime, dest
        //         ));
        //     }
        // }

        if let Some(failure) = res.failure {
            match failure {
                PushFailure::Unknown(f) => {
                    self.console.error(format!(
                        "Unknown error while pushing typegraph {tg_name}",
                        tg_name = name.cyan(),
                    ));
                    self.console.error(f.message);
                    self.push_manager
                        .do_send(PushFinished::new(res.push, false))
                }

                PushFailure::DatabaseResetRequired(failure) => {
                    ctx.address().do_send(DatabaseReset {
                        push: res.push,
                        name,
                        failure,
                    });
                }

                PushFailure::NullConstraintViolation(failure) => {
                    ctx.address().do_send(ResolveNullConstraintViolation {
                        push: res.push,
                        failure,
                    });
                }
            }
        } else {
            self.push_manager.do_send(PushFinished::new(res.push, true))
        }
    }
}

impl Handler<DatabaseReset> for PusherActor {
    type Result = ();

    fn handle(&mut self, msg: DatabaseReset, _ctx: &mut Self::Context) -> Self::Result {
        let DatabaseResetRequired {
            message,
            runtime_name,
        } = msg.failure;
        let name = msg.name.cyan();

        self.console.error(format!(
            "Database reset required for prisma runtime {rt} in typegraph {name}",
            rt = runtime_name.magenta(),
        ));
        self.console.error(message);

        let typegraph = msg.push.typegraph.clone();
        self.push_manager
            .do_send(PushFinished::new(msg.push, false).confirm(
                format!(
                    "Do you want to reset the database for runtime {rt} on {name}?",
                    rt = runtime_name.magenta(),
                ),
                ConfirmDatabaseResetRequired {
                    push_manager: self.push_manager.clone(),
                    runtime_name,
                    typegraph,
                },
            ));
    }
}

impl Handler<ResolveNullConstraintViolation> for PusherActor {
    type Result = ();

    fn handle(
        &mut self,
        msg: ResolveNullConstraintViolation,
        _ctx: &mut Self::Context,
    ) -> Self::Result {
        let NullConstraintViolation {
            message,
            runtime_name,
            migration_name,
            is_new_column,
            column,
            table,
        } = msg.failure;
        self.console.error(message);
        if is_new_column {
            let typegraph = msg.push.typegraph.clone();
            self.console.info(format!("manually edit the migration {migration_name}; or remove the migration and add set a default value"));

            // let remove_latest = RemoveLatestMigration {
            //     typegraph: typegraph.clone(),
            //     runtime_name: runtime_name.clone(),
            //     migration_name: migration_name.clone(),
            //     migration_dir: migration_dir.clone(),
            //     push_manager: self.push_manager.clone(),
            //     console: self.console.clone(),
            // };

            let manual = ManualResolution {
                typegraph: typegraph.clone(),
                runtime_name: runtime_name.clone(),
                migration_name: migration_name.clone(),
                // migration_dir,
                message: Some(format!(
                    "Set a default value for the column `{}` in the table `{}`",
                    column, table
                )),
                push_manager: self.push_manager.clone(),
                console: self.console.clone(),
            };

            let reset = ForceReset {
                typegraph: typegraph.clone(),
                runtime_name: runtime_name.clone(),
                push_manager: self.push_manager.clone(),
            };

            self.push_manager
                .do_send(PushFinished::new(msg.push, false).select(
                    "Choose one of the following options".to_string(),
                    vec![
                        /*Box::new(remove_latest)*/ Box::new(manual),
                        Box::new(reset),
                    ],
                ));
        } else {
            self.push_manager
                .do_send(PushFinished::new(msg.push, false))
        }
    }
}

#[derive(Debug)]
struct ConfirmDatabaseResetRequired {
    push_manager: Addr<PushManagerActor>,
    #[allow(unused)]
    runtime_name: String,
    typegraph: Arc<TypegraphInfos>,
}

impl ConfirmHandler for ConfirmDatabaseResetRequired {
    fn on_confirm(&self) {
        // TODO: interactivity
        #[allow(unused)]
        let typegraph = (*self.typegraph).clone();
        self.push_manager.do_send(Push::new(typegraph.into()))
    }
}

impl Handler<Stop> for PusherActor {
    type Result = ();

    fn handle(&mut self, _msg: Stop, ctx: &mut Self::Context) -> Self::Result {
        ctx.stop();
    }
}
