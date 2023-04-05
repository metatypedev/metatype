// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::Action;
use super::CommonArgs;
use super::GenArgs;
use crate::codegen;
use crate::config;
use crate::typegraph::{LoaderResult, TypegraphLoader};
use crate::utils;

use crate::utils::{ensure_venv, Node};
use anyhow::{bail, Context, Error, Result};
use async_recursion::async_recursion;
use async_trait::async_trait;
use clap::Parser;
use colored::Colorize;
use common::typegraph::Typegraph;
use globset::Glob;
use ignore::gitignore::Gitignore;
use ignore::Match;
use indoc::indoc;
use notify::event::ModifyKind;
use notify::{
    recommended_watcher, Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use reqwest::Url;
use serde::Deserialize;
use serde_json::{self, json};
use std::collections::HashMap;
use std::path::Path;
use std::path::PathBuf;
use std::sync::Arc;
use std::thread::sleep;
use std::time::Duration;
use tiny_http::{Header, Response, Server};
use tokio::runtime::Handle;

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
        let dir = args.dir;
        let config_path = args.config;
        ensure_venv(&dir)?;

        // load config file or use default values if doesn't exist
        let config = config::Config::load_or_find(config_path, &dir)
            .unwrap_or_else(|_| config::Config::default_in(&dir));

        let node_config = config.node("dev").with_args(&self.node);
        let node = node_config.build()?;

        let loaded = TypegraphLoader::with_config(&config)
            .load_folder(&dir)
            .context("Error while loading typegraphs from folder");

        // TODO start watching here...

        match loaded {
            Ok(loaded) => {
                if loaded.is_empty() {
                    println!("No typegraph found. Watching the directory for changes...");
                } else {
                    println!();
                    push_loaded_typegraphs(dir.clone(), loaded, &node).await;
                }
            }
            Err(err) => log_err(err),
        }

        let config = Arc::new(config);
        let config_clone = config.clone();
        let node_clone = node.clone();
        let watch_path = dir.clone();

        let handle = Handle::current();
        let _watcher = watch(dir.clone(), move |paths| {
            let loaded = TypegraphLoader::with_config(&config)
                .skip_deno_modules()
                .load_files(paths);
            for (_path, res) in loaded.into_iter() {
                if let Result::Ok(tgs) = res {
                    for tg in tgs.into_iter() {
                        codegen::deno::codegen(tg, watch_path.clone())
                            .expect("could not run deno codegen");
                    }
                }
            }

            let loaded = TypegraphLoader::with_config(&config).load_files(paths);

            handle.block_on(push_loaded_typegraphs(
                watch_path.clone(),
                loaded,
                &node_clone,
            ));
        })
        .unwrap();

        let config = config_clone;

        let server = Server::http(format!("0.0.0.0:{}", self.port)).unwrap();

        for request in server.incoming_requests() {
            let url = Url::parse(&format!("http://dummy{}", request.url()))?;
            let query: HashMap<String, String> = url.query_pairs().into_owned().collect();

            let tg_node = node.clone();
            let response = match url.path() {
                "/dev" => match query.get("node") {
                    Some(node) => {
                        let tgs = TypegraphLoader::with_config(&config).load_folder(&dir)?;
                        let mut tg_node = tg_node;
                        tg_node.base_url = node.parse()?;

                        push_loaded_typegraphs(dir.clone(), tgs, &tg_node).await;
                        Response::from_string(json!({"message": "reloaded"}).to_string())
                            .with_header(
                                "Content-Type: application/json".parse::<Header>().unwrap(),
                            )
                    }
                    _ => Response::from_string(json!({"error": "missing query 'node"}).to_string())
                        .with_status_code(400)
                        .with_header("Content-Type: application/json".parse::<Header>().unwrap()),
                },
                _ => Response::from_string(json!({"error": "not found"}).to_string())
                    .with_status_code(404)
                    .with_header("Content-Type: application/json".parse::<Header>().unwrap()),
            };

            request.respond(response)?;
        }

        Ok(())
    }
}

fn watch<H>(dir: String, handler: H) -> Result<RecommendedWatcher>
where
    H: Fn(&Vec<PathBuf>) + Send + 'static,
{
    let diff_base = Path::new(&dir).to_path_buf().canonicalize()?;
    let mut watcher = recommended_watcher(move |res: Result<Event, notify::Error>| {
        let event = res.unwrap();
        let paths = get_paths(&event);

        if !paths.is_empty() {
            match event.kind {
                EventKind::Create(_)
                | EventKind::Remove(_)
                | EventKind::Modify(ModifyKind::Data(_))
                | EventKind::Modify(ModifyKind::Name(_)) => {
                    println!(
                        "Changes detected in {}",
                        paths
                            .iter()
                            .map(|p| utils::relative_path_display(diff_base.clone(), p))
                            .collect::<Vec<_>>()
                            .join(", "),
                    );
                    handler(&paths);
                }
                _ => {}
            }
        }
    })
    .unwrap();

    watcher
        .configure(
            Config::default()
                .with_poll_interval(Duration::from_secs(1))
                .with_compare_contents(true),
        )
        .unwrap();

    watcher
        .watch(Path::new(&dir), RecursiveMode::Recursive)
        .unwrap();
    Ok(watcher)
}

fn get_paths(event: &Event) -> Vec<PathBuf> {
    let gi = Gitignore::new(Path::new(".gitignore")).0;
    let gs = Glob::new("*.py").unwrap().compile_matcher();

    event
        .paths
        .iter()
        .filter(|path| {
            !matches!(
                gi.matched_path_or_any_parents(path, false),
                Match::Ignore(_)
            )
        })
        .filter(|path| gs.is_match(path))
        .map(|path| path.to_path_buf())
        .collect()
}

pub async fn push_loaded_typegraphs(dir: String, loaded: LoaderResult, node: &Node) {
    let base = Path::new(&dir).to_path_buf().canonicalize().unwrap();
    for (path, res) in loaded.into_iter() {
        match res.with_context(|| format!("Error while loading typegraphs from {path}")) {
            Result::Ok(tgs) => {
                let path = utils::relative_path_display(base.clone(), path);
                println!(
                    "Loading {count} typegraph{s} from {path}:",
                    count = tgs.len(),
                    s = utils::plural_prefix(tgs.len()),
                );
                for tg in tgs.iter() {
                    println!(
                        "  → Pushing typegraph {name}...",
                        name = tg.name().unwrap().blue()
                    );
                    match push_typegraph(&base, tg, node, 3).await {
                        Ok(_) => {
                            println!("  {}", "✓ Success!".to_owned().green());
                        }
                        Err(e) => {
                            println!("  {}", "✗ Failed!".to_owned().red());
                            println!("Could not push typegraph:\n{e:?}");
                        }
                    }
                }
            }
            Result::Err(err) => {
                log_err(err);
            }
        }
    }
    println!();
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    Info,
    Warning,
    Error,
}

#[derive(Deserialize, Debug)]
pub struct MessageEntry {
    #[serde(rename = "type")]
    pub type_: MessageType,
    pub text: String,
}

#[derive(Deserialize, Debug)]
pub struct PushResult {
    pub name: String,
    pub messages: Vec<MessageEntry>,
}

#[async_recursion]
pub async fn push_typegraph(
    base: &PathBuf,
    tg: &Typegraph,
    node: &Node,
    backoff: u32,
) -> Result<PushResult> {
    use crate::utils::graphql::{Error as GqlError, GraphqlErrorMessages, Query};
    let secrets = lade_sdk::hydrate(node.env.clone(), base.clone()).await?;
    let query = node
        .post("/typegate")?
        .gql(
            indoc! {"
            mutation InsertTypegraph($tg: String!, $secrets: String!) {
                addTypegraph(fromString: $tg, secrets: $secrets) {
                    name
                    messages { type text }
                }
            }"}
            .to_string(),
            Some(json!({ "tg": serde_json::to_string(tg)?, "secrets": serde_json::to_string(&secrets)? })),
        )
        .await;

    use GqlError::*;
    match query {
        Err(EndpointNotReachable(e)) => {
            if backoff <= 1 {
                bail!("node unreachable: {e}")
            }
            #[cfg(debug_assertions)]
            eprintln!("Endpoint not reachable: {e}");
            println!("Retry: typegate not reachable");
            sleep(Duration::from_secs(5));
            push_typegraph(base, tg, node, backoff - 1).await
        }
        Err(FailedQuery(e)) => {
            if backoff <= 1 {
                bail!("typegraph push error:\n{}", e.error_messages().dimmed())
            }
            #[cfg(debug_assertions)]
            eprintln!("Query failed:\n{}", e.error_messages());
            println!("Retry: Query failed");
            sleep(Duration::from_secs(5));
            push_typegraph(base, tg, node, backoff - 1).await
        }
        Err(InvalidResponse(e)) => {
            if backoff <= 1 {
                bail!("Invalid HTTP response: {e}")
            }
            #[cfg(debug_assertions)]
            eprintln!("Invalid response: {e:?}");
            println!("Retry: Invalid response");
            sleep(Duration::from_secs(5));
            push_typegraph(base, tg, node, backoff - 1).await
        }
        Ok(res) => Ok(res.data("addTypegraph")?),
    }
}
