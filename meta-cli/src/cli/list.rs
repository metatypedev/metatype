// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use common::graphql::Query;
use common::typegraph::Typegraph;
use reqwest::Url;

use super::serialize::orchestrate_serialization_workflow;
use super::{Action, ConfigArgs};
use crate::config::NodeConfig;
use crate::deploy::actors::task_manager::TaskSource;
use crate::interlude::*;
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
struct TypegraphObject {
    name: String,
    url: String,
}

impl List {
    async fn get_more_info(&self, dir: PathBuf) -> Result<Vec<TypegraphObject>> {
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
        typegraphs: Vec<Box<Typegraph>>,
    ) -> Result<()> {
        let mut tables: Vec<Table> = Vec::new();

        Table::print_table_header();

        for tg in typegraphs {
            let mut table = Table::new(tg.name().unwrap());
            table.set_path(tg.get_path().ok());
            tables.push(table);
        }

        if let Ok(more_info) = self.get_more_info(dir).await {
            for tg in more_info {
                let mut table = Table::new(tg.name);
                table.set_url(Some(tg.url));
                tables.push(table);
            }
        }

        Table::print_table_header();
        for table in tables {
            println!("{}", table.to_table_row());
        }

        Ok(())
    }
}

#[derive(Debug, Clone)]
struct Table {
    name: String,
    path: Option<String>,
    url: Option<String>,
}

impl Table {
    fn new(name: String) -> Self {
        Self {
            name,
            path: None,
            url: None,
        }
    }

    fn set_path(&mut self, path: Option<String>) {
        self.path = path;
    }

    fn set_url(&mut self, url: Option<String>) {
        self.url = url;
    }

    fn to_table_row(&self) -> String {
        format!(
            "{:<50} {:<20} {:<30}",
            self.name,
            self.path.as_deref().unwrap_or("None"),
            self.url.as_deref().unwrap_or("None")
        )
    }

    fn print_table_header() {
        println!("{:<50} {:<20} {:<30}", "NAME", "PATH", "URL");
    }
}
