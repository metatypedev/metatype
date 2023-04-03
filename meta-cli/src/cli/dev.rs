// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::Action;
use super::CommonArgs;
use super::GenArgs;
use crate::config;
use crate::typegraph::loader::Loader;
use crate::typegraph::loader::LoaderError;
use crate::typegraph::loader::LoaderOptions;
use crate::typegraph::loader::LoaderOutput;
use crate::typegraph::postprocess;
use crate::typegraph::postprocess::prisma_rt::EmbedPrismaMigrations;
use crate::typegraph::push::PushLoopBuilder;
use crate::typegraph::push::PushQueueEntry;

use crate::utils::{ensure_venv, Node};
use anyhow::{bail, Context, Error, Result};
use async_trait::async_trait;
use clap::Parser;
use colored::Colorize;
use std::path::Path;
use std::time::Duration;

#[derive(Parser, Debug)]
pub struct Dev {
    #[command(flatten)]
    node: CommonArgs,

    #[clap(long, default_value_t = 5000)]
    port: u32,
}

fn log_err(err: Error) {
    println!("{}", format!("{err:?}").red());
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
        let node: Node = node_config.try_into()?;

        let mut loader_options = LoaderOptions::with_config(&config);
        loader_options
            .with_postprocessor(
                EmbedPrismaMigrations::default()
                    .allow_dirty(true)
                    .create_migration(true),
            )
            .dir(&dir)
            .watch(true)
            .skip_deno_modules(true)
            .with_postprocessor(postprocess::Codegen);

        let mut loader: Loader = loader_options.into();

        let mut push_loop = PushLoopBuilder::on(node)
            .exit(false)
            .retry(3, Duration::from_secs(5))
            .on_pushed(|res| {
                res.print_messages();
            })
            .start()?;

        while let Some(output) = loader.next().await {
            match output {
                LoaderOutput::Typegraph { path, typegraph } => {
                    push_loop.push(PushQueueEntry::new(path, typegraph))?;
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

        push_loop.join().await?;

        // let server = Server::http(format!("0.0.0.0:{}", self.port)).unwrap();
        //
        // for request in server.incoming_requests() {
        //     let url = Url::parse(&format!("http://dummy{}", request.url()))?;
        //     let query: HashMap<String, String> = url.query_pairs().into_owned().collect();
        //
        //     let tg_node = node.clone();
        //     let response = match url.path() {
        //         "/dev" => match query.get("node") {
        //             Some(node) => {
        //                 let tgs = TypegraphLoader::with_config(&config).load_folder(&dir)?;
        //                 let mut tg_node = tg_node;
        //                 tg_node.base_url = node.parse()?;
        //
        //                 // push_loaded_typegraphs(dir.clone(), tgs, &tg_node).await;
        //                 Response::from_string(json!({"message": "reloaded"}).to_string())
        //                     .with_header(
        //                         "Content-Type: application/json".parse::<Header>().unwrap(),
        //                     )
        //             }
        //             _ => Response::from_string(json!({"error": "missing query 'node"}).to_string())
        //                 .with_status_code(400)
        //                 .with_header("Content-Type: application/json".parse::<Header>().unwrap()),
        //         },
        //         _ => Response::from_string(json!({"error": "not found"}).to_string())
        //             .with_status_code(404)
        //             .with_header("Content-Type: application/json".parse::<Header>().unwrap()),
        //     };
        //
        //     request.respond(response)?;
        // }

        Ok(())
    }
}
