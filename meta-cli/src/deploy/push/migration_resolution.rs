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
        do_force_reset(&self.loader, tg_path, runtime_name);
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
        let tg_path = self.typegraph_path.clone();
        let runtime_name = self.runtime_name.clone();
        do_force_reset(&self.loader, tg_path, runtime_name);
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
        tokio::fs::remove_dir_all(migration_path).await?; // !

        console.info(format!("Removed migration directory: {:?}", migration_path));
        console.info(format!(
            "You can now update your typegraph at {} to create an alternative non-breaking schema.",
            typegraph_path.display().to_string().bold()
        ));

        let tg_path = typegraph_path.to_path_buf();
        let runtime_name = runtime_name.clone();
        do_force_reset(&loader, tg_path, runtime_name);

        Ok(())
    }
}

impl SelectOption for RemoveLatestMigration {
    fn on_select(&self) {
        let migration_path = self
            .migration_dir
            .join(&self.runtime_name)
            .join(&self.migration_name);

        let runtime_name = self.runtime_name.clone();
        let console = self.console.clone();
        let loader = self.loader.clone();
        let typegraph_path = self.typegraph_path.clone();

        Arbiter::current().spawn(async move {
            if let Err(e) = Self::apply(
                &migration_path,
                &typegraph_path,
                runtime_name,
                console.clone(),
                loader,
            )
            .await
            {
                console.warning(format!("Migration Path {}", migration_path.display()));
                console.error(e.to_string());
                panic!("{}", e.to_string()); // could occur if the latest migration does not match
            }
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
            do_force_reset(&loader, typegraph_path, runtime_name);
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

/// Set `reset` to `true` for the specified prisma runtime + re-run the typegraph
fn do_force_reset(loader: &Addr<LoaderActor>, tg_path: PathBuf, runtime_name: String) {
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
    loader.do_send(LoadModule(tg_path.into()));
}
