// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

use crate::config::Config;
use clap::Parser;

use super::{Action, NodeArgs};

#[derive(Parser, Debug)]
pub struct Undeploy {
    #[command(flatten)]
    node: NodeArgs,

    #[clap(short, long)]
    pub target: String,

    /// Typegraph names
    #[clap(long = "typegraph")]
    pub typegraphs: Vec<String>,
}

#[async_trait]
impl Action for Undeploy {
    #[tracing::instrument]
    async fn run(&self, args: super::ConfigArgs) -> Result<()> {
        let dir = args.dir()?;
        let config_path = args.config.clone();
        let config = Config::load_or_find(config_path, &dir)?;
        let node_config = config.node(&self.node, &self.target);
        let node = node_config.build(&dir).await?;

        node.try_undeploy(&self.typegraphs)
            .await
            .map_err(anyhow_to_eyre!())?;
        Ok(())
    }
}
