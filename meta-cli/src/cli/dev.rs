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

    /// Target typegate (cf config)
    #[clap(short, long)]
    pub target: Option<String>,

    #[clap(long, default_value_t = false)]
    run_destructive_migrations: bool,

    #[clap(long)]
    max_parallel_loads: Option<usize>,
}

#[async_trait]
impl Action for Dev {
    async fn run(&self, args: GenArgs) -> Result<()> {
        log::info!("'meta dev' subcommand is an alias to 'meta deploy --codegen --allow-dirty --watch --create-migration'");
        let options = DeployOptions {
            codegen: true,
            allow_dirty: true,
            allow_destructive: self.run_destructive_migrations,
            watch: true,
            no_migration: false,
            create_migration: true,
        };

        let deploy = DeploySubcommand::new(
            self.node.clone(),
            self.target.clone().unwrap_or("dev".to_string()),
            options,
            None,
            self.max_parallel_loads,
        );
        deploy.run(args).await
    }
}
