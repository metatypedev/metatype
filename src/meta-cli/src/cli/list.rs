// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Action, ConfigArgs, NodeArgs};
use crate::config::{Config, PathOption};
use crate::deploy::actors::console::ConsoleActor;
use crate::deploy::actors::task::list::{ListAction, ListActionGenerator};
use crate::deploy::actors::task::TaskFinishStatus;
use crate::deploy::actors::task_manager::{Report, StopReason, TaskManagerInit, TaskSource};
use crate::interlude::*;
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use common::graphql::Query;
use common::node::Node;
use serde::Deserialize;
use tabled::{settings::Style, Table, Tabled};

#[derive(Parser, Debug)]
pub struct List {
    #[command(flatten)]
    node: NodeArgs,
    /// Target typegate (cf config)
    #[clap(short, long)]
    pub target: String,

    #[clap(long)]
    max_parallel_loads: Option<usize>,
}

#[async_trait]
impl Action for List {
    #[tracing::instrument]
    async fn run(&self, args: ConfigArgs) -> Result<()> {
        let dir = args.dir()?;
        let config_path = args.config.clone();
        let config = Arc::new(Config::load_or_find(config_path.as_deref(), &dir)?);

        let mut node_config = config.node(&self.node, &self.target);
        if self.target == "dev" {
            node_config
                .url
                .set_port(Some(7891))
                .map_err(|_| anyhow::anyhow!("cannot base"))?;
        }
        let node = node_config.build(dir.clone()).await?;

        let task_source = TaskSource::Discovery(dir.clone().into());

        let console = ConsoleActor::new(Arc::clone(&config)).start();

        let action_generator = ListActionGenerator::new(
            node.prefix.clone(),
            config.dir().unwrap_or_log().into(),
            dir.clone().into(),
            config
                .prisma_migrations_base_dir(PathOption::Absolute)
                .into(),
            true,
        );

        let mut init = TaskManagerInit::<ListAction>::new(
            config.clone(),
            action_generator,
            console,
            task_source,
        );

        if let Some(max_parallel_tasks) = self.max_parallel_loads {
            init = init.max_parallel_tasks(max_parallel_tasks);
        }

        let report = init.run().await;

        match report.stop_reason {
            StopReason::Error => bail!("failed"),
            StopReason::Manual | StopReason::ManualForced => {
                bail!("cancelled")
            }
            StopReason::Natural => {}
            StopReason::Restart => panic!("restart not supported for list"),
        };

        let typegraphs = report.into_typegraph_info()?;
        self.display_typegraphs(typegraphs, node).await
    }
}

#[derive(Debug, Clone, Deserialize)]
struct TypegraphInfo {
    name: String,
    url: Option<String>,
    path: Option<String>,
}

impl List {
    async fn fetch_typegraphs(&self, node: Node) -> Result<Vec<TypegraphInfo>> {
        let query = r#"
            query {
                typegraphs {
                    name
                    url
                }
            }
        "#;
        let response = node
            .post("/typegate")
            .unwrap()
            .gql(query.into(), None)
            .await?;
        response
            .data("typegraphs")
            .map_err(|err| anyhow::anyhow!(err))
    }

    async fn display_typegraphs(
        &self,
        local_typegraphs: Vec<TypegraphInfo>,
        node: Node,
    ) -> Result<()> {
        let mut typegraph_entries: Vec<TypegraphEntry> = local_typegraphs
            .into_iter()
            .map(|tg| TypegraphEntry {
                name: tg.name,
                path: tg.path.unwrap_or_else(|| "-".to_string()),
                url: tg.url.unwrap_or_else(|| "-".to_string()),
                target: "-".to_string(),
            })
            .collect();

        match self.fetch_typegraphs(node).await {
            Ok(fetched_typegraphs) => {
                for fetched_tg in fetched_typegraphs {
                    if let Some(existing_entry) = typegraph_entries
                        .iter_mut()
                        .find(|t| t.name == fetched_tg.name)
                    {
                        existing_entry
                            .update_info(fetched_tg.url.unwrap_or_default(), self.target.clone());
                    } else {
                        typegraph_entries.push(TypegraphEntry {
                            name: fetched_tg.name,
                            path: "-".to_string(),
                            url: fetched_tg.url.unwrap_or_default(),
                            target: self.target.clone(),
                        });
                    }
                }
            }
            Err(err) => eprintln!("Error fetching {} typegraphs: {}", self.target, err),
        }

        let mut table = Table::new(typegraph_entries);
        table.with(Style::blank());
        println!("{table}");
        Ok(())
    }
}

#[derive(Debug, Clone, Tabled)]
struct TypegraphEntry {
    #[tabled(rename = "NAME")]
    name: String,
    #[tabled(rename = "PATH")]
    path: String,
    #[tabled(rename = "URL")]
    url: String,
    #[tabled(rename = "TARGET")]
    target: String,
}

impl TypegraphEntry {
    fn update_info(&mut self, url: String, target: String) {
        self.url = url;
        self.target = target;
    }
}

trait ListTypegraphInfo {
    fn into_typegraph_info(self) -> Result<Vec<TypegraphInfo>>;
}

impl ListTypegraphInfo for Report<ListAction> {
    fn into_typegraph_info(self) -> Result<Vec<TypegraphInfo>> {
        let mut typegraphs = vec![];

        for entry in self.entries.into_iter() {
            match entry.status {
                TaskFinishStatus::Finished(results) => {
                    for (_, info) in results.into_iter() {
                        let info = info.unwrap();
                        let path = String::from(entry.path.to_str().unwrap());
                        typegraphs.push(TypegraphInfo {
                            name: info.typegraph,
                            url: None,
                            path: Some(path),
                        });
                    }
                }
                TaskFinishStatus::Cancelled => {
                    tracing::error!("serialization cancelled for {:?}", entry.path);
                    return Err(ferr!("cancelled"));
                }
                TaskFinishStatus::Error => {
                    tracing::error!("serialization failed for {:?}", entry.path);
                    return Err(ferr!("failed"));
                }
            }
        }

        Ok(typegraphs)
    }
}
