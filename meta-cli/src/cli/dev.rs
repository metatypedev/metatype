// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::deploy::DeployOptions;
use super::deploy::DeploySubcommand;
use super::Action;
use super::CommonArgs;
use super::GenArgs;
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;

#[derive(Parser, Debug)]
pub struct Dev {
    #[command(flatten)]
    node: CommonArgs,

    /// Typegate target (in metatype.yaml)
    #[clap(short, long, default_value_t = String::from("dev"))]
    target: String,

    #[clap(long, default_value_t = false)]
    run_destructive_migrations: bool,
}

#[async_trait]
impl Action for Dev {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let options = DeployOptions {
            codegen: true,
            allow_dirty: true,
            allow_destructive: self.run_destructive_migrations,
            watch: true,
            target: self.target.clone(),
            no_migration: false,
            create_migration: true,
        };

        let deploy = DeploySubcommand::new(self.node.clone(), options, None);
        deploy.run(args).await
    }
}
