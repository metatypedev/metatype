// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use crate::interlude::*;

use super::deploy::DeployOptions;
use super::deploy::DeploySubcommand;
use super::Action;
use super::ConfigArgs;
use super::NodeArgs;
use actix_web::dev::ServerHandle;
use clap::Parser;

#[derive(Parser, Debug)]
pub struct Dev {
    #[command(flatten)]
    node: NodeArgs,

    /// Target typegate (cf config)
    #[clap(short, long)]
    pub target: Option<String>,

    #[clap(long, default_value_t = false)]
    run_destructive_migrations: bool,

    #[clap(long)]
    max_parallel_loads: Option<usize>,

    /// secrets overload
    #[clap(long = "secret")]
    secrets: Vec<String>,
}

#[async_trait]
impl Action for Dev {
    #[tracing::instrument]
    async fn run(&self, args: ConfigArgs, server_handle: Option<ServerHandle>) -> Result<()> {
        log::info!("'meta dev' subcommand is an alias to 'meta deploy --codegen --allow-dirty --watch --create-migration'");
        let options = DeployOptions {
            codegen: true,
            allow_dirty: true,
            allow_destructive: self.run_destructive_migrations,
            watch: true,
            no_migration: false,
            create_migration: true,
            secrets: self.secrets.clone(),
        };

        let deploy = DeploySubcommand::new(
            self.node.clone(),
            self.target.clone().unwrap_or("dev".to_string()),
            options,
            None,
            self.max_parallel_loads,
        );
        deploy.run(args, server_handle).await
    }
}
