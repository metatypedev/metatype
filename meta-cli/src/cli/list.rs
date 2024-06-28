// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::serialize::SerializeReportExt;
use super::{Action, ConfigArgs};
use crate::config::{Config, PathOption};
use crate::deploy::actors::console::ConsoleActor;
use crate::deploy::actors::task::serialize::{SerializeAction, SerializeActionGenerator};
use crate::deploy::actors::task_manager::{StopReason, TaskManagerInit, TaskSource};
use crate::interlude::*;
use clap::Parser;
use common::typegraph::Typegraph;
use core::fmt::Debug;

use common::graphql::Query;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};

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
        let config_path = args.config.clone();

        let config = Config::load_or_find(config_path, &dir)?;

        let config = Arc::new(config);

        let console = ConsoleActor::new(Arc::clone(&config)).start();

        let action_generator = SerializeActionGenerator::new(
            config.dir().unwrap_or_log().into(),
            dir.clone().into(),
            config
                .prisma_migrations_base_dir(PathOption::Absolute)
                .into(),
            true,
        );

        let task_source = TaskSource::Discovery(dir.into());

        let mut init = TaskManagerInit::<SerializeAction>::new(
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
            StopReason::Restart => panic!("restart not supported for serialize"),
        }

        let tgs = report.into_typegraphs()?;

        self.display_typegrahs(tgs).await?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
struct TypegraphObject {
    name: String,
    url: String,
}

impl List {
    async fn get_more_info(&self) -> Result<Vec<TypegraphObject>> {
        let client = reqwest::Client::new();

        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Basic {}", "YWRtaW46cGFzc3dvcmQ="))?, // I don't know if it right, may be get from env
        );

        let query = r#"
            query {
                typegraphs {
                    name
                    url
                }
            }
        "#;

        let response = client
            .post("http://localhost:7891/typegate") // this too, may be get from env
            .headers(headers)
            .gql(query.into(), None)
            .await?;

        response
            .data("typegraphs")
            .map_err(|err| anyhow::format_err!(err))
    }

    #[allow(clippy::vec_box)]
    async fn display_typegrahs(&self, tgs: Vec<Box<Typegraph>>) -> Result<()> {
        let mut tables: Vec<Table> = Vec::new();
        for tg in tgs {
            let mut table = Table::new(tg.name().unwrap());
            table.set_path(tg.get_path().ok());
            tables.push(table);
        }

        if let Ok(more_tgs) = self.get_more_info().await {
            for tg in more_tgs {
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
        Table {
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
