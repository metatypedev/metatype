// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    config::Config,
    utils::{graphql::Query, Node},
};
use anyhow::{Context, Result};
use async_trait::async_trait;
use clap::Parser;
use indoc::indoc;

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
        node.undeploy(&self.typegraphs).await?;

        Ok(())
    }
}

impl Node {
    async fn undeploy(&self, typegraphs: &[String]) -> Result<()> {
        let res = self
            .post("/typegate")?
            .gql(
                indoc! {"
                mutation($names: [String!]!) {
                    removeTypegraphs(names: $names)
                }"}
                .to_string(),
                Some(serde_json::json!({
                    "names": typegraphs,
                })),
            )
            .await?;

        let res: bool = res
            .data("removeTypegraphs")
            .context("removeTypegraph reponse")?;
        if !res {
            anyhow::bail!("undeploy failed");
        }
        Ok(())
    }
}
