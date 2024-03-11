// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};

use actix::prelude::*;
use anyhow::Result;
use colored::Colorize;

use crate::{
    com::store::{MigrationAction, RuntimeMigrationAction, ServerStore},
    deploy::actors::{
        console::{
            input::{ConfirmHandler, OptionLabel, SelectOption},
            Console, ConsoleActor,
        },
        loader::{LoadModule, LoaderActor},
    },
};

// DatabaseReset failure

#[derive(Debug)]
pub struct ConfirmDatabaseResetRequired {
    pub typegraph_path: PathBuf,
    pub loader: Addr<LoaderActor>,
    pub runtime_name: String,
}

impl ConfirmHandler for ConfirmDatabaseResetRequired {
    fn on_confirm(&self) {
        let tg_path = self.typegraph_path.clone();
        let runtime_name = self.runtime_name.clone();

        // reset
        let glob_cfg = ServerStore::get_migration_action_glob();
        ServerStore::set_migration_action(
            tg_path.clone(),
            RuntimeMigrationAction {
                runtime_name,
                action: MigrationAction {
                    reset: true, // !
                    create: glob_cfg.create,
                },
            },
        );

        // reload
        self.loader.do_send(LoadModule(tg_path.into()));
    }
}

// NullConstraintViolation failure

#[derive(Debug)]
pub struct ForceReset {
    pub loader: Addr<LoaderActor>,
    pub typegraph_path: PathBuf,
    pub runtime_name: String,
}

impl SelectOption for ForceReset {
    fn on_select(&self) {
        // force reload
        // set_file_mtime(self.typegraph_path.clone(), FileTime::now()).unwrap();
        self.loader
            .do_send(LoadModule(self.typegraph_path.clone().into()));
    }

    fn label(&self) -> OptionLabel<'_> {
        OptionLabel::new("Force reset the development database.").with_secondary(
            "Warning: The failed migration will potentially fail again in deployment.",
        )
    }
}

#[derive(Debug)]
pub struct RemoveLatestMigration {
    pub loader: Addr<LoaderActor>,
    pub typegraph_path: PathBuf,
    pub migration_dir: PathBuf,
    pub runtime_name: String,
    pub migration_name: String, // is this necessary??
    pub console: Addr<ConsoleActor>,
}

impl RemoveLatestMigration {
    pub async fn apply(
        migration_path: &Path,
        typegraph_path: &Path,
        runtime_name: String,
        console: Addr<ConsoleActor>,
        loader: Addr<LoaderActor>,
    ) -> Result<()> {
        tokio::fs::remove_dir_all(migration_path).await?;
        console.info(format!("Removed migration directory: {:?}", migration_path));
        console.info(format!(
            "You can now update your typegraph at {} to create an alternative non-breaking schema.",
            typegraph_path.display().to_string().bold()
        ));

        loader.do_send(LoadModule(typegraph_path.to_path_buf().into()));
        // QUESTION: Reload or is there anything else more to do??
        todo!("OneTimePushOption::ForceReset {runtime_name}");
    }
}

impl SelectOption for RemoveLatestMigration {
    fn on_select(&self) {
        let migration_path = self.migration_dir.join(&self.migration_name);
        let runtime_name = self.runtime_name.clone();
        let console = self.console.clone();
        let loader = self.loader.clone();
        let typegraph_path = self.typegraph_path.clone();

        Arbiter::current().spawn(async move {
            Self::apply(
                &migration_path,
                &typegraph_path,
                runtime_name,
                console,
                loader,
            )
            .await
            .unwrap(); // TODO handle error
        });
    }

    fn label(&self) -> OptionLabel<'_> {
        OptionLabel::new("Remove the latest migration.")
    }
}

#[derive(Debug)]
pub struct ManualResolution {
    pub loader: Addr<LoaderActor>,
    pub typegraph_path: PathBuf,
    pub migration_dir: PathBuf,
    pub runtime_name: String,
    pub migration_name: String,
    pub message: Option<String>,
    pub console: Addr<ConsoleActor>,
}

impl SelectOption for ManualResolution {
    fn on_select(&self) {
        let mig_path = self
            .migration_dir
            .join(format!("{}/migration.sql", self.migration_name));
        eprint!(
            "Edit the migration file at {:?} then press enter to continue...",
            mig_path
        );

        let console = self.console.clone();
        let runtime_name = self.runtime_name.clone();
        let typegraph_path = self.typegraph_path.clone();
        let loader = self.loader.clone();

        Arbiter::current().spawn(async move {
            // TODO watch migration file??
            console.read_line().await;

            loader.do_send(LoadModule(typegraph_path.into()));
            // QUESTION: Reload or is there anything else more to do??
            todo!("OneTimePushOption::ForceReset {runtime_name}");
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
