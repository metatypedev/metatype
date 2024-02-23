// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    com::store::{Command, ServerStore},
    config::Config,
};
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;

use super::{Action, CommonArgs};

#[derive(Parser, Debug)]
pub struct Undeploy {
    #[command(flatten)]
    node: CommonArgs,

    #[clap(short, long)]
    pub target: String,

    /// Typegraph names
    #[clap(long = "typegraph")]
    pub typegraphs: Vec<String>,
}

#[async_trait]
impl Action for Undeploy {
    async fn run(&self, args: super::GenArgs) -> Result<()> {
        let dir = args.dir()?;
        let config_path = args.config.clone();
        let config = Config::load_or_find(config_path, &dir)?;
        let node_config = config.node(&self.node, &self.target);
        let node = node_config.build(&dir).await?;

        // Hint the server what state we are globally in
        ServerStore::with(Some(Command::Undeploy), Some(config.clone()));

        node.try_undeploy(&self.typegraphs).await?;
        Ok(())
    }
}
