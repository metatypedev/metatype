// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use color_eyre::owo_colors::OwoColorize;

use super::{
    DeployAction, DeployActionInner, DeployOptions, Migration, MigrationActionOverride,
    PrismaRuntimeId,
};
use crate::deploy::actors::console::input::{Confirm, Select, SelectOption};
use crate::deploy::actors::console::Console;
use crate::deploy::actors::task::action::{ActionFinalizeContext, TaskFilter};
use crate::deploy::actors::task::TaskActor;
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

type RuntimeName = String;

impl DeployActionInner {
    // TODO why not async?
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

    pub(super) async fn handle_push_failure(
        &self,
        tg_name: &str,
        typegraph_path: &Path,
        failure_raw: &str,
        ctx: &ActionFinalizeContext<Arc<Self>>,
        scope: &impl std::fmt::Display,
    ) -> Result<Option<(RuntimeName, MigrationActionOverride)>> {
        let failure = serde_json::from_str::<PushFailure>(failure_raw)
            .context("failed to parse failure data")?;
        match failure {
            PushFailure::Unknown(error) => {
                ctx.console.error(format!(
                    "{scope} unknown error: {msg}",
                    scope = scope,
                    msg = error.message,
                ));

                Ok(None)
            }

            PushFailure::DatabaseResetRequired(error) => {
                ctx.console
                    .error(format!("{scope} {message}", message = error.message));
                ctx.console.warning(format!(
                    "{scope} database reset required for prisma runtime {rt} in typegraph {name}",
                    name = tg_name.cyan(),
                    rt = error.runtime_name.magenta(),
                ));

                let reset = Confirm::new(
                    ctx.console.clone(),
                    format!(
                        "{scope} Do you want to reset the database for prisma runtime {rt} in typegraph {name}?",
                        scope = scope.yellow(),
                        name = tg_name.cyan(),
                        rt = error.runtime_name.magenta(),
                    ),
                ).interact( ).await.context("failed to read user input")?;

                if reset {
                    Ok(Some((
                        error.runtime_name,
                        MigrationActionOverride::ResetDatabase,
                    )))
                } else {
                    Ok(None)
                }
            }

            PushFailure::NullConstraintViolation(error) => {
                ctx.console
                    .error(format!("{scope} {message}", message = error.message));

                if error.is_new_column {
                    ctx.console.info(format!("{scope} manually edit the migration {migration} or remove the migration and set a default value in the typegraph", migration = error.migration_name));
                }

                use options::ConstraintViolationOptions as Options;
                let (_, choice) = Select::new(
                    ctx.console.clone(),
                    "Choose one of the following options".to_string(),
                )
                .interact(&[
                    Box::new(options::RemoveLatestMigration),
                    Box::new(options::ManualResolution {
                        message: Some(format!(
                            "Set a default value for the column `{}` in the table `{}`",
                            error.column, error.table
                        )),
                    }),
                    Box::new(options::ForceReset),
                ])
                .await
                .context("failed to read user input: {err}")?;

                match choice {
                    Options::RemoveLatestMigration => {
                        let migration_path = ctx
                            .config
                            .prisma_migration_dir_abs(tg_name)
                            .join(&error.runtime_name)
                            .join(&error.migration_name);
                        tokio::fs::remove_dir_all(&migration_path)
                            .await
                            .with_context(|| {
                                format!("failed to remove migrations at {migration_path:?}")
                            })?;
                        ctx.console
                            .info(format!("Removed migration directory: {migration_path:?}"));
                        ctx.console.info(format!("You can now update your typegraph at {} to create an alternative non-breaking schema.", typegraph_path.to_str().unwrap().bold()));
                        Ok(Some((
                            error.runtime_name,
                            MigrationActionOverride::ResetDatabase,
                        )))
                    }
                    Options::ManualResolution => {
                        let migration_path = ctx
                            .config
                            .prisma_migration_dir_abs(tg_name)
                            .join(&error.runtime_name)
                            .join(&error.migration_name);
                        eprintln!("Edit the migration file at {migration_path:?} then press enter to continue...");

                        ctx.console.read_line().await;
                        Ok(Some((
                            error.runtime_name,
                            MigrationActionOverride::ResetDatabase,
                        )))
                    }
                    Options::ForceReset => Ok(Some((
                        error.runtime_name,
                        MigrationActionOverride::ResetDatabase,
                    ))),
                }
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
    pub(super) struct ResolveConstraintViolation {
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

mod options {
    use crate::deploy::actors::console::input::{OptionLabel, SelectOption};

    pub enum ConstraintViolationOptions {
        RemoveLatestMigration,
        ManualResolution,
        ForceReset,
    }

    #[derive(Debug)]
    pub struct RemoveLatestMigration;

    impl SelectOption<ConstraintViolationOptions> for RemoveLatestMigration {
        fn get_value(&self) -> ConstraintViolationOptions {
            ConstraintViolationOptions::RemoveLatestMigration
        }

        fn label(&self) -> OptionLabel<'_> {
            OptionLabel::new("Remove the latest migration.")
        }
    }

    #[derive(Debug)]
    pub struct ManualResolution {
        pub message: Option<String>,
    }

    impl SelectOption<ConstraintViolationOptions> for ManualResolution {
        fn get_value(&self) -> ConstraintViolationOptions {
            ConstraintViolationOptions::ManualResolution
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
    pub struct ForceReset;

    impl SelectOption<ConstraintViolationOptions> for ForceReset {
        fn get_value(&self) -> ConstraintViolationOptions {
            ConstraintViolationOptions::ForceReset
        }

        fn label(&self) -> OptionLabel<'_> {
            OptionLabel::new("Force reset the development database.").with_secondary(
                "Warning: The failed migration will potentially fail again in deployment.",
            )
        }
    }
}
