// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{path::Path, sync::Arc};

use actix::prelude::*;
use anyhow::Result;
use colored::Colorize;
use common::typegraph::Typegraph;
use filetime::{set_file_mtime, FileTime};

use crate::deploy::actors::console::{Console, ConsoleActor};
use crate::deploy::actors::push_manager::{AddOneTimeOptions, OneTimePushOption};
use crate::input::SelectOption;
use crate::{deploy::actors::push_manager::PushManagerActor, input::OptionLabel};

#[derive(Debug)]
pub struct ForceReset {
    pub typegraph: Arc<Typegraph>,
    pub runtime_name: String,
    pub push_manager: Addr<PushManagerActor>,
}

impl SelectOption for ForceReset {
    fn on_select(&self) {
        self.push_manager.do_send(AddOneTimeOptions {
            typegraph_key: self.typegraph.get_key().unwrap(),
            options: vec![OneTimePushOption::ForceReset {
                runtime_name: self.runtime_name.clone(),
            }],
        });

        // force reload
        set_file_mtime(self.typegraph.path.as_ref().unwrap(), FileTime::now()).unwrap();
    }

    fn label(&self) -> OptionLabel<'_> {
        OptionLabel::new("Force reset the development database.").with_secondary(
            "Warning: The failed migration will potentially fail again in deployment.",
        )
    }
}

#[derive(Debug)]
pub struct RemoveLatestMigration {
    pub typegraph: Arc<Typegraph>,
    pub runtime_name: String,
    pub migration_name: String, // is this necessary??
    pub migration_dir: Arc<Path>,
    pub push_manager: Addr<PushManagerActor>,
    pub console: Addr<ConsoleActor>,
}

impl RemoveLatestMigration {
    pub async fn apply(
        migration_path: &Path,
        typegraph_key: String,
        runtime_name: String,
        push_manager: Addr<PushManagerActor>,
        console: Addr<ConsoleActor>,
    ) -> Result<()> {
        tokio::fs::remove_dir_all(migration_path).await?;
        console.info(format!("Removed migration directory: {:?}", migration_path));
        console.info(format!(
            "You can now update your typegraph at {} to create an alternative non-breaking schema.",
            typegraph_key.bold()
        ));

        // reset the database on the next reload
        push_manager.do_send(AddOneTimeOptions {
            typegraph_key,
            options: vec![OneTimePushOption::ForceReset { runtime_name }],
        });

        Ok(())
    }
}

impl SelectOption for RemoveLatestMigration {
    fn on_select(&self) {
        let migration_path = self.migration_dir.join(&self.migration_name);
        let runtime_name = self.runtime_name.clone();
        let push_manager = self.push_manager.clone();
        let console = self.console.clone();
        let typegraph_key = self.typegraph.get_key().unwrap();

        Arbiter::current().spawn(async move {
            Self::apply(
                &migration_path,
                typegraph_key,
                runtime_name,
                push_manager,
                console,
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
    pub typegraph: Arc<Typegraph>,
    pub runtime_name: String,
    pub migration_name: String,
    pub message: Option<String>,
    pub migration_dir: Arc<Path>,
    pub push_manager: Addr<PushManagerActor>,
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
        let push_manager = self.push_manager.clone();
        let typegraph_key = self.typegraph.get_key().unwrap();
        let runtime_name = self.runtime_name.clone();
        let typegraph_path = self.typegraph.path.clone().unwrap();

        Arbiter::current().spawn(async move {
            // TODO watch migration file??
            console.read_line().await;

            push_manager.do_send(AddOneTimeOptions {
                typegraph_key,
                options: vec![OneTimePushOption::ForceReset {
                    runtime_name: runtime_name.clone(),
                }],
            });

            // force reload
            set_file_mtime(typegraph_path, FileTime::now()).unwrap();
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
