// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::prisma::PrismaArgs;
use super::Action;
use super::CommonArgs;
use super::GenArgs;
use crate::config;
use crate::typegraph::loader::Loader;
use crate::typegraph::loader::LoaderError;
use crate::typegraph::loader::LoaderOptions;
use crate::typegraph::loader::LoaderOutput;
use crate::typegraph::postprocess;
use crate::typegraph::push::PushLoopBuilder;
use crate::typegraph::push::PushQueueEntry;

use crate::utils::ensure_venv;
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use colored::Colorize;
use common::archive::unpack;
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
        let dir = Path::new(&args.dir).canonicalize()?;
        let config_path = args.config;
        ensure_venv(&dir)?;

        // load config file or use default values if doesn't exist
        let config = config::Config::load_or_find(config_path, &dir)
            .unwrap_or_else(|_| config::Config::default_in(&dir));

        let node_config = config.node("dev").with_args(&self.node);
        let node = node_config.build()?;

        let mut loader_options = LoaderOptions::with_config(&config);
        loader_options
            .with_postprocessor(
                postprocess::EmbedPrismaMigrations::default()
                    .allow_dirty(true)
                    .create_migration(true)
                    .reset_on_drift(self.run_destructive_migrations),
            )
            .dir(&dir)
            .watch(true)
            .codegen();

        let mut loader: Loader = loader_options.into();

        let mut push_loop = PushLoopBuilder::on(node, dir.clone())
            .exit(false)
            .retry(3, Duration::from_secs(5))
            .on_pushed(move |res| {
                res.print_messages();
                // -> .inspect_err()
                let custom_data = res
                    .iter_custom_data()
                    .map_err(|err| {
                        eprintln!("Error while parsing custom data: {err:?}");
                        err
                    })
                    .ok()
                    .into_iter()
                    .flatten();
                for (k, v) in custom_data {
                    if let Some(rt_name) = k.strip_prefix("migrations:") {
                        let prisma_args = PrismaArgs {
                            typegraph: res.tg_name().to_owned(),
                            runtime: Some(rt_name.to_owned()),
                            migrations: None,
                        };

                        let base_dir = config
                            .typegraphs
                            .materializers
                            .prisma
                            .base_migrations_path(&prisma_args, &config);
                        let path = base_dir.join(rt_name);
                        let serde_json::Value::String(migrations) = v else {
                            eprintln!("Invalid data format: expected string for migrations");
                            break;
                        };
                        let res = unpack(&path, Some(migrations));
                        if let Err(err) = res {
                            eprintln!("Error while unpacking migrations into {path:?}: {err:?}");
                        }
                    }
                }
            })
            .start()?;

        while let Some(output) = loader.next().await {
            match output {
                LoaderOutput::Typegraph(tg) => {
                    push_loop.push(PushQueueEntry::new(tg))?;
                }
                LoaderOutput::Rewritten(path) => {
                    println!("Typegraph definition module at {path:?} has been rewritten by an importer.");
                }
                LoaderOutput::Error(LoaderError::PostProcessingError {
                    path,
                    typegraph_name,
                    error,
                }) => {
                    println!("Error: error while post-processing typegraph {name} from {path:?}: {error:?}", name = typegraph_name.blue());
                }
                LoaderOutput::Error(LoaderError::UnknownFileType(_)) => {}
                LoaderOutput::Error(LoaderError::SerdeJson { path, error }) => {
                    println!("Error: an unexpected error occurred while parsing raw string format of the typegraph(s) from {path:?}: {error:?}");
                }
                LoaderOutput::Error(LoaderError::Unknown { path, error }) => {
                    println!("Error: an unexpected error occurred while loading typegraphs from {path:?}: {error:?}");
                }
            }
        }

        let port = self.port;
        tokio::task::spawn_blocking(move || {
            let server = Server::http(format!("0.0.0.0:{}", port)).unwrap();

            for request in server.incoming_requests() {
                let url = Url::parse(&format!("http://dummy{}", request.url())).unwrap();
                let query: HashMap<String, String> = url.query_pairs().into_owned().collect();

                // let tg_node = node.clone();
                let response = match url.path() {
                    "/dev" => match query.get("node") {
                        Some(_node) => {
                            loader.reload_all().unwrap();
                            Response::from_string(json!({"message": "reloaded"}).to_string())
                                .with_header(
                                    "Content-Type: application/json".parse::<Header>().unwrap(),
                                )
                        }
                        _ => Response::from_string(
                            json!({"error": "missing query 'node"}).to_string(),
                        )
                        .with_status_code(400)
                        .with_header("Content-Type: application/json".parse::<Header>().unwrap()),
                    },
                    _ => Response::from_string(json!({"error": "not found"}).to_string())
                        .with_status_code(404)
                        .with_header("Content-Type: application/json".parse::<Header>().unwrap()),
                };

                request.respond(response).unwrap();
            }
        });

        push_loop.join().await?;

        Ok(())
    }
}
