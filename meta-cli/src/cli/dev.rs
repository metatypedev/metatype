// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

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

    #[clap(long, default_value_t = 5000)]
    port: u32,

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
            target: "dev".to_owned(),
            no_migration: false,
            create_migration: true,
        };

        let deploy = DeploySubcommand::new(self.node.clone(), options, None);
        deploy.run(args).await
    }
}
