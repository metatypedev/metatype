// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use crate::interlude::*;

use super::deploy::DeployOptions;
use super::deploy::DeploySubcommand;
use super::Action;
use super::ConfigArgs;
use super::NodeArgs;
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
    threads: Option<usize>,

    /// secrets overload
    #[clap(long = "secret")]
    secrets: Vec<String>,

    #[cfg(feature = "typegate")]
    /// Do not run a typegate. By default a typegate is run with the current target configuration
    #[clap(long)]
    no_typegate: bool,

    /// max retry count
    #[clap(long)]
    retry: Option<usize>,

    /// initial retry interval
    #[clap(long)]
    retry_interval_ms: Option<u64>,
}

#[async_trait]
impl Action for Dev {
    #[tracing::instrument]
    async fn run(&self, args: ConfigArgs) -> Result<()> {
        log::info!("'meta dev' subcommand is an alias to 'meta deploy --codegen --allow-dirty --watch --create-migration'");
        let options = DeployOptions {
            allow_dirty: true,
            allow_destructive: self.run_destructive_migrations,
            watch: true,
            no_migration: false,
            create_migration: true,
            secrets: self.secrets.clone(),
            #[cfg(feature = "typegate")]
            run_typegate: !self.no_typegate,
            threads: self.threads,
            retry: self.retry,
            retry_interval_ms: self.retry_interval_ms,
        };

        let deploy = DeploySubcommand::new(
            self.node.clone(),
            self.target.clone().unwrap_or("dev".to_string()),
            options,
            None,
        );
        deploy.run(args).await
    }
}
