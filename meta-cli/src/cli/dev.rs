// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::deploy::Deploy;
use super::deploy::DeployOptions;
use super::prisma::PrismaArgs;
use super::Action;
use super::CommonArgs;
use super::GenArgs;
use crate::config;
use crate::typegraph::loader::Loader;
use crate::typegraph::loader::LoaderError;
use crate::typegraph::postprocess;

use crate::utils::ensure_venv;
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use colored::Colorize;
use common::archive::unpack;
use log::error;
use log::warn;
use reqwest::Url;
use serde_json::json;
use std::collections::HashMap;
use std::path::Path;
use std::time::Duration;
use tiny_http::{Header, Response, Server};

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
        let mut options = DeployOptions::default();
        options.codegen = true;
        options.allow_dirty = true;
        options.run_destructive_migrations = self.run_destructive_migrations;
        options.watch = true;
        options.target = "dev".to_owned();

        let deploy = Deploy::new(self.node.clone(), options, None);
        deploy.run(args).await

        // let port = self.port;
        // tokio::task::spawn_blocking(move || {
        //     let server = Server::http(format!("0.0.0.0:{}", port)).unwrap();
        //
        //     for request in server.incoming_requests() {
        //         let url = Url::parse(&format!("http://dummy{}", request.url())).unwrap();
        //         let query: HashMap<String, String> = url.query_pairs().into_owned().collect();
        //
        //         // let tg_node = node.clone();
        //         let response = match url.path() {
        //             "/dev" => match query.get("node") {
        //                 Some(_node) => {
        //                     loader.reload_all().unwrap();
        //                     Response::from_string(json!({"message": "reloaded"}).to_string())
        //                         .with_header(
        //                             "Content-Type: application/json".parse::<Header>().unwrap(),
        //                         )
        //                 }
        //                 _ => Response::from_string(
        //                     json!({"error": "missing query 'node"}).to_string(),
        //                 )
        //                 .with_status_code(400)
        //                 .with_header("Content-Type: application/json".parse::<Header>().unwrap()),
        //             },
        //             _ => Response::from_string(json!({"error": "not found"}).to_string())
        //                 .with_status_code(404)
        //                 .with_header("Content-Type: application/json".parse::<Header>().unwrap()),
        //         };
        //
        //         request.respond(response).unwrap();
        //     }
        // });
        //
        // push_loop.join().await?;
    }
}
