// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use clap::Parser;
use super::serialize::orchestrate_serialization_workflow;
use super::{Action, ConfigArgs};
use crate::config::NodeConfig;
use crate::deploy::actors::task_manager::TaskSource;
use crate::interlude::*;
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use common::graphql::Query;
use common::typegraph::Typegraph;
use reqwest::Url;
use serde::Deserialize;

#[derive(Parser, Debug)]
pub struct List {
    #[clap(long)]
    max_parallel_loads: Option<usize>,
}

#[async_trait]
impl Action for List {
    #[tracing::instrument]
    async fn run(&self, args: ConfigArgs) -> Result<()> {
        let dir = args.dir()?;
        let task_source = TaskSource::Discovery(dir.clone().into());
        let typegraphs = orchestrate_serialization_workflow(
            args,
            dir.clone(),
            None,
            self.max_parallel_loads,
            task_source,
        )
        .await?;
        self.display_typegraphs(dir, typegraphs).await
    }
}

#[derive(Debug, Clone, Deserialize)]
struct TypegraphInfo {
    name: String,
    url: String,
}

impl List {
    async fn fetch_deployed_typegraphs(&self, dir: PathBuf) -> Result<Vec<TypegraphInfo>> {
        let query = r#"
            query {
                typegraphs {
                    name
                    url
                }
            }
        "#;
        let mut node_config = NodeConfig::default();
        node_config.url = Url::parse("http://localhost:7891")?;
        let node = node_config.build(dir).await?;
        let response = node
            .post("/typegate")
            .unwrap()
            .gql(query.into(), None)
            .await?;
        response
            .data("typegraphs")
            .map_err(|err| anyhow::anyhow!(err))
    }

    #[allow(clippy::vec_box)]
    async fn display_typegraphs(
        &self,
        dir: PathBuf,
        local_typegraphs: Vec<Box<Typegraph>>,
    ) -> Result<()> {
        let mut typegraph_entries: Vec<TypegraphEntry> = Vec::new();

        for tg in local_typegraphs {
            let entry = TypegraphEntry::new(
                tg.name().unwrap(),
                tg.get_path().ok(),
                None,
                "-".to_string(),
            );
            typegraph_entries.push(entry);
        }

        if let Ok(deployed_typegraphs) = self.fetch_deployed_typegraphs(dir).await {
            for deployed_tg in deployed_typegraphs {
                if let Some(existing_entry) = typegraph_entries
                    .iter_mut()
                    .find(|t| t.name == deployed_tg.name)
                {
                    existing_entry.update_deployment_info(deployed_tg.url);
                } else {
                    let entry = TypegraphEntry::new(
                        deployed_tg.name,
                        None,
                        Some(deployed_tg.url),
                        "deployed".to_string(),
                    );
                    typegraph_entries.push(entry);
                }
            }
        }

        TypegraphEntry::print_table_header();
        for entry in typegraph_entries {
            println!("{}", entry.to_table_row());
        }
        Ok(())
    }
}

#[derive(Debug, Clone)]
struct TypegraphEntry {
    name: String,
    path: Option<String>,
    url: Option<String>,
    deployment_status: String,
}

impl TypegraphEntry {
    fn new(
        name: String,
        path: Option<String>,
        url: Option<String>,
        deployment_status: String,
    ) -> Self {
        Self {
            name,
            path,
            url,
            deployment_status,
        }
    }

    fn update_deployment_info(&mut self, url: String) {
        self.url = Some(url);
        self.deployment_status = "deployed".to_string();
    }

    fn to_table_row(&self) -> String {
        format!(
            "{:<50} {:<20} {:<50} {:<20}",
            self.name,
            self.path.as_deref().unwrap_or("-"),
            self.url.as_deref().unwrap_or("-"),
            self.deployment_status
        )
    }

    fn print_table_header() {
        println!(
            "{:<50} {:<20} {:<50} {:<20}",
            "NAME", "PATH", "URL", "DEPLOYMENT STATUS"
        );
    }
}
