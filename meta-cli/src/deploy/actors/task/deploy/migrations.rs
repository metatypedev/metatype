use color_eyre::owo_colors::OwoColorize;

use super::{DeployAction, DeployActionInner, Migration, MigrationActionOverride, PrismaRuntimeId};
use crate::deploy::actors::console::Console;
use crate::deploy::actors::console::input::{ConfirmHandler, Confirm, Select};
use crate::deploy::actors::task::TaskActor;
use crate::deploy::actors::task::action::ActionFinalizeContext;
use crate::interlude::*;

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
#[allow(unused)]
pub struct DatabaseResetRequired {
    message: String,
    runtime_name: String,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
#[allow(unused)]
pub struct NullConstraintViolation {
    message: String,
    runtime_name: String,
    column: String,
    migration_name: String,
    is_new_column: bool,
    table: String,
}

#[allow(unused)]
struct ResolveNullConstraintViolation {
    failure: NullConstraintViolation,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GenericPushFailure {
    message: String,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(tag = "reason")]
enum PushFailure {
    Unknown(GenericPushFailure),
    DatabaseResetRequired(DatabaseResetRequired),
    NullConstraintViolation(NullConstraintViolation),
}

impl DeployActionInner {
    pub(super) fn unpack_migrations(
        &self,
        tg_name: &str,
        migrations: &[Migration],
        ctx: &ActionFinalizeContext<Arc<Self>>,
        scope: &impl std::fmt::Display,
    ) {
        let migdir = ctx.config.prisma_migration_dir_abs(tg_name);

        for migration in migrations.iter() {
            let dest = migdir.join(&migration.runtime);
            if let Err(err) = common::archive::unpack(&dest, Some(&migration.archive)) {
                ctx.console.error(format!(
                    "{scope} error while unpacking migrations into {:?}",
                    migdir
                ));
                ctx.console.error(format!("{err:?}"));
            } else {
                ctx.console.info(format!(
                    "{scope} unpacked migrations for {}/{} at {}",
                    tg_name.cyan(),
                    migration.runtime,
                    dest.display().bold()
                ));
            }
        }
    }

    pub(super) fn handle_push_failure(
        &self,
        tg_name: &str,
        failure_raw: &str,
        ctx: &ActionFinalizeContext<Arc<Self>>,
        scope: &impl std::fmt::Display,
    ) {
        let failure = serde_json::from_str::<PushFailure>(failure_raw);
        match failure {
            Ok(PushFailure::Unknown(error)) => {
                ctx.console.error(format!(
                    "{scope} unknown error: {msg}",
                    scope = scope,
                    msg = error.message,
                ));
            }

            Ok(PushFailure::DatabaseResetRequired(error)) => {
                ctx.task.do_send(message::ConfirmDatabaseReset {
                    typegraph: tg_name.to_string(),
                    runtime: error.runtime_name.clone(),
                    message: error.message.clone(),
                });
            }

            Ok(PushFailure::NullConstraintViolation(error)) => {
                ctx.task
                    .do_send(message::ResolveConstraintViolation {
                        typegraph: tg_name.to_string(),
                        runtime: error.runtime_name.clone(),
                        column: error.column.clone(),
                        migration: error.migration_name.clone(),
                        is_new_column: error.is_new_column,
                        table: error.table.clone(),
                        message: error.message.clone(),
                    });
            }

            Err(err) => {
                ctx.console.error(format!(
                    "{scope} failed to parse push failure data: {err:?}",
                    scope = scope,
                    err = err
                ));
            }
        }
    }
}

pub mod message {
    use super::*;

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct ConfirmDatabaseReset {
        pub typegraph: String,
        pub runtime: String,
        pub message: String,
    }

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct ResetDatabase {
        pub typegraph: String,
        pub runtime: String,
    }

    #[derive(Message)]
    #[rtype(result = "()")]
    pub (super) struct ResolveConstraintViolation {
        pub typegraph: String,
        pub runtime: String,
        pub column: String,
        pub migration: String,
        pub is_new_column: bool,
        pub table: String,
        pub message: String,
    }

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct RemoveLatestMigration {
        pub typegraph: String,
        pub runtime: String,
        pub migration: String,
    }

    #[derive(Message)]
    #[rtype(result = "()")]
    pub(super) struct WaitForManualResolution {
        pub typegraph: String,
        pub runtime: String,
        pub migration: String,
    }

}

use message::*;

#[derive(Debug)]
pub struct ConfirmDatabaseResetRequired {
    pub task: Addr<TaskActor<DeployAction>>,
    pub tg_name: String,
    pub runtime_name: String,
}

impl ConfirmHandler for ConfirmDatabaseResetRequired {
    fn on_confirm(&self) {
        self.task.do_send(message::ResetDatabase {
            typegraph: self.tg_name.clone(),
            runtime: self.runtime_name.clone(),
        })
    }
}

impl Handler<ConfirmDatabaseReset> for TaskActor<DeployAction> {
    type Result = ();

    fn handle(&mut self, msg: ConfirmDatabaseReset, ctx: &mut Self::Context) {
        let ConfirmDatabaseReset {
            typegraph,
            runtime,
            message,
        } = msg;
        let scope = format!("({})", self.action.path.display());

        self.console.error(format!("{scope} {message}"));
        self.console.warning(format!(
            "{scope} database reset required for prisma runtime {rt} in typegraph {name}",
            scope = scope.yellow(),
            name = typegraph.cyan(),
            rt = runtime.magenta(),
        ));

        let console = self.console.clone();
        let addr = ctx.address();

        let fut = async move {
            let res = Confirm::new(
                console.clone(),
                format!(
                    "{scope} Do you want to reset the database for prisma runtime {rt} in typegraph {name}?",
                    scope = scope.yellow(),
                    name = typegraph.cyan(),
                    rt = runtime.magenta(),
                ),
            ).interact(
                Box::new(ConfirmDatabaseResetRequired {
                    task: addr,
                    tg_name: typegraph,
                    runtime_name: runtime,
                })
            
            ).await;

            if let Err(err) = res {
                console.error(format!("failed to read user input: {err}", err = err));
            }
            
    };
        ctx.spawn(fut.in_current_span().into_actor(self));
}}

impl Handler<ResetDatabase> for TaskActor<DeployAction> {
    type Result = ();

    fn handle(&mut self, msg: ResetDatabase, _: &mut Self::Context) {
        self.followup_task.migrations.push(( PrismaRuntimeId {
            typegraph: msg.typegraph.clone(),
            name: msg.runtime.clone(),
        },
                 MigrationActionOverride::ResetDatabase,
        ));

        // /// Set `reset` to `true` for the specified prisma runtime + re-run the typegraph
        // fn do_force_reset(loader: &Addr<LoaderActor>, tg_path: PathBuf, runtime_name: String) {
        //     // reset
        //     let glob_cfg = ServerStore::get_migration_action_glob();
        //     ServerStore::set_migration_action(
        //         tg_path.clone(),
        //         RuntimeMigrationAction {
        //             runtime_name,
        //             action: MigrationAction {
        //                 reset: true, // !
        //                 create: glob_cfg.create,
        //             },
        //         },
        //     );
        //
        //     // reload
        //     loader.do_send(LoadModule(tg_path.into()));
        // }
    }
}

impl Handler<ResolveConstraintViolation> for TaskActor<DeployAction> {
    type Result = ();

    fn handle(&mut self, msg: ResolveConstraintViolation, ctx: &mut Self::Context) {
        let ResolveConstraintViolation {
            typegraph,
            runtime,
            column,
            migration,
            is_new_column,
            table,
            message,
        } = msg;

        let scope = format!("({})", self.action.path.display());
        let scope = scope.yellow();

        self.console.error(format!("{scope} {message}"));

        if is_new_column {
            self.console.info(format!("{scope} manually edit the migration {migration} or remove the migration and set a default value"));


        let remove_latest = options::RemoveLatestMigration {
            task: ctx.address(),
            typegraph: typegraph.clone(),
            runtime: runtime.clone(),
            migration: migration.clone(),
        };

        let manual = options::ManualResolution {
            task: ctx.address(),
            typegraph: typegraph.clone(),
            runtime: runtime.clone(),
            migration: migration.clone(),
            message: Some(format!(
                "Set a default value for the column `{}` in the table `{}`",
                column, table
            )),
        };

        let reset = options::ForceReset {
            task: ctx.address(),
            typegraph: typegraph.clone(),
            runtime: runtime.clone(),
        };

        let fut = async move {
        let res = Select::new(self.console.clone(), "Choose one of the following options".to_string()).interact(&[Box::new(remove_latest), Box::new(manual), Box::new(reset)]).await;
        if let Err(err) = res {
            self.console.error(format!("failed to read user input: {err}", err = err));
        } 

        };

    }
}
}

impl Handler<message::RemoveLatestMigration> for TaskActor<DeployAction> {
    type Result = ();

    fn handle(&mut self, msg: message::RemoveLatestMigration, ctx: &mut Self::Context) {
        let message::RemoveLatestMigration {
            typegraph,
            runtime,
            migration,
        } = msg;

        let migration_path = self.config.prisma_migration_dir_abs(&typegraph).join(&runtime).join(&migration);

        // let typegraph = typegraph.clone();
        // let runtime_name = runtime.clone();
        let console = self.console.clone();
        let typegraph_path = self.action.path.clone();
        let addr = ctx.address();

        let fut = async move {
            let res = tokio::fs::remove_dir_all(&migration_path).await;
            match res {
                Ok(_) => {
                    console.info(format!("Removed migration directory: {:?}", migration_path));
                    console.info(format!(
                        "You can now update your typegraph at {} to create an alternative non-breaking schema.",
                        typegraph_path.display().to_string().bold()
                    ));

                    addr.do_send(message::ResetDatabase {
                        typegraph,
                        runtime,
                    });
                }
                Err(err) => {
                    console.error(format!("Failed to remove migration directory: {:?}", migration_path));
                    console.error(format!("{err}", err = err));
                }
            }
        };

        ctx.spawn(fut.in_current_span().into_actor(self));
    }
}

impl Handler<message::WaitForManualResolution> for TaskActor<DeployAction> {
    type Result = ();

    fn handle(&mut self, msg: message::WaitForManualResolution, ctx: &mut Self::Context) {
        let migration_path = self.config.prisma_migration_dir_abs(&msg.typegraph).join(&msg.runtime).join(msg.migration).join("migration.sql");
        eprintln!("Edit the migration file at {:?} then press enter to continue...", migration_path);

        let console = self.console.clone();
        let addr = ctx.address();

        let fut = async move {
            console.read_line().await;
            addr.do_send(message::ResetDatabase {
                typegraph: msg.typegraph,
                runtime: msg.runtime,
            });
        };
        ctx.spawn(fut.in_current_span().into_actor(self));
    }
}

mod options {
    use crate::deploy::actors::console::input::{SelectOption, OptionLabel};
    use crate::deploy::actors::task::TaskActor;
    use crate::deploy::actors::task::deploy::DeployAction;
    use crate::interlude::*;

#[derive(Debug)]
pub struct RemoveLatestMigration {
    pub task: Addr<TaskActor<DeployAction>>,
    pub typegraph: String,
    pub runtime: String,
    pub migration: String, // is this necessary??
}


impl SelectOption for RemoveLatestMigration {
    fn on_select(&self) {
        self.task.do_send(super::message::RemoveLatestMigration {
            typegraph: self.typegraph.clone(),
            runtime: self.runtime.clone(),
            migration: self.migration.clone(),
        });
    }

    fn label(&self) -> OptionLabel<'_> {
        OptionLabel::new("Remove the latest migration.")
    }
}

#[derive(Debug)]
pub struct ManualResolution {
    pub task: Addr<TaskActor<DeployAction>>,
    pub typegraph: String,
    pub runtime: String,
    pub migration: String,
    pub message: Option<String>,
}

impl SelectOption for ManualResolution {
    fn on_select(&self) {
        self.task.do_send(super::message::WaitForManualResolution {
            typegraph: self.typegraph.clone(),
            runtime: self.runtime.clone(),
            migration: self.migration.clone(),
        });
    }

    fn label(&self) -> OptionLabel<'_> {
        let label = OptionLabel::new("Manually resolve the migration.");
        if let Some(message) = &self.message {
            label.with_secondary(format!("Edit the migration file: {}.", message))
        } else {
            label
        }
    }
}

#[derive(Debug)]
pub struct ForceReset {
    pub task: Addr<TaskActor<DeployAction>>,
    pub typegraph: String,
    pub runtime: String,
}

impl SelectOption for ForceReset {
    fn on_select(&self) {
        self.task.do_send(super::message::ResetDatabase {
            typegraph: self.typegraph.clone(),
            runtime: self.runtime.clone(),
        });
    }

    fn label(&self) -> OptionLabel<'_> {
        OptionLabel::new("Force reset the development database.").with_secondary(
            "Warning: The failed migration will potentially fail again in deployment.",
        )
    }
}


}

