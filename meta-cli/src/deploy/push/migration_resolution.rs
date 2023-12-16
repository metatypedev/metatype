// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{
    path::{Path, PathBuf},
    sync::Arc,
};

use actix::{Addr, Arbiter};
use anyhow::Result;
use common::typegraph::Typegraph;

use crate::deploy::actors::{push_manager::PushManagerActor, pusher::Push};
use crate::input::SelectOption;
use crate::typegraph::postprocess::EmbeddedPrismaMigrationOptionsPatch;

#[derive(Debug)]
pub struct ForceReset {
    pub typegraph: Arc<Typegraph>,
    pub runtime_name: String,
}

impl std::fmt::Display for ForceReset {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Force reset the development database.")?;
        write!(
            f,
            " Warning: The failed migration will potentially fail again in deployment"
        )
    }
}

impl SelectOption for ForceReset {
    fn on_select(&self, push_manager: Addr<PushManagerActor>) {
        let mut typegraph = (*self.typegraph).clone();
        EmbeddedPrismaMigrationOptionsPatch::default()
            .reset_on_drift(true) // TODO what?? -- rename??
            .apply(&mut typegraph, vec![self.runtime_name.clone()])
            .unwrap();
        push_manager.do_send(Push::new(typegraph.into()))
    }
}

#[derive(Debug)]
pub struct RemoveLatestMigration {
    pub typegraph: Arc<Typegraph>,
    pub runtime_name: String,
    pub migration_name: String, // is this necessary??
    pub message: Option<String>,
    pub migration_dir: PathBuf,
}

impl RemoveLatestMigration {
    pub async fn apply(
        migration_path: &Path,
        mut typegraph: Typegraph,
        runtime_name: String,
        push_manager: Addr<PushManagerActor>,
    ) -> Result<()> {
        tokio::fs::remove_dir_all(migration_path).await?;

        // This will reset the database
        EmbeddedPrismaMigrationOptionsPatch::default()
            .reset_on_drift(true)
            .apply(&mut typegraph, vec![runtime_name.clone()])
            .unwrap();
        push_manager.do_send(Push::new(typegraph.into()));

        Ok(())
    }
}

impl std::fmt::Display for RemoveLatestMigration {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Remove the latest migration.")?;
        if let Some(message) = &self.message {
            write!(f, " {}", message)?;
        }

        Ok(())
    }
}

impl SelectOption for RemoveLatestMigration {
    fn on_select(&self, push_manager: Addr<PushManagerActor>) {
        let migration_path = self.migration_dir.join(format!(
            "{}/{}/{}",
            self.typegraph.name().unwrap(),
            self.runtime_name,
            self.migration_name
        ));
        let typegraph = (*self.typegraph).clone();
        let runtime_name = self.runtime_name.clone();

        Arbiter::current().spawn(async move {
            let migration_path = migration_path;
            Self::apply(&migration_path, typegraph, runtime_name, push_manager)
                .await
                .unwrap(); // TODO handle error
        });
    }
}

#[derive(Debug)]
pub struct ManualResolution {
    pub typegraph: Arc<Typegraph>,
    pub runtime_name: String,
    pub migration_name: String,
    pub message: Option<String>,
    pub migration_dir: PathBuf,
}

impl std::fmt::Display for ManualResolution {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let migration_file = self.migration_dir.join(format!(
            "{}/{}/{}/migration.sql",
            self.typegraph.name().unwrap(),
            self.runtime_name,
            self.migration_name
        ));

        write!(
            f,
            "Manually resolve the migration: Edit the migration file at {:?}",
            migration_file
        )?;

        if let Some(message) = &self.message {
            write!(f, " {}", message)?;
        } else {
            write!(f, ".")?;
        }

        Ok(())
    }
}

impl SelectOption for ManualResolution {
    fn on_select(&self, push_manager: Addr<PushManagerActor>) {
        eprintln!("Press enter to continue...");
        let mut input = String::new();
        std::io::stdin().read_line(&mut input).unwrap();

        let mut typegraph = (*self.typegraph).clone();

        EmbeddedPrismaMigrationOptionsPatch::default()
            .reset_on_drift(true)
            .reload_migration_files(self.migration_dir.join(format!(
                "{}/{}",
                self.typegraph.name().unwrap(),
                self.runtime_name
            )))
            .apply(&mut typegraph, vec![self.runtime_name.clone()])
            .unwrap();

        push_manager.do_send(Push::new(typegraph.into()))
    }
}
