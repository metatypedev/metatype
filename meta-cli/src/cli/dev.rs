use crate::codegen;
use crate::typegraph::TypegraphLoader;
use anyhow::{Error, Ok, Result};
use ignore::Match;
use notify::event::ModifyKind;
use notify::{
    recommended_watcher, Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::thread::sleep;
use std::time::Duration;

use clap::Parser;
use globset::Glob;
use ignore::gitignore::Gitignore;
use reqwest::{self, Url};
use serde_json::{self, json};
use tiny_http::{Header, Response, Server};

use super::Action;

#[derive(Parser, Debug)]
pub struct Dev {}

impl Action for Dev {
    fn run(&self, dir: String) -> Result<()> {
        let tgs = TypegraphLoader::new().serialized().load_all()?;
        reload_typegraphs(tgs, "127.0.0.1:7890".to_string())?;

        let watch_path = dir.clone();
        let _watcher = watch(dir.clone(), move |paths| {
            let tgs = TypegraphLoader::new()
                .skip_deno_modules()
                .serialized()
                .load_files(paths)
                .unwrap();
            for tg in tgs.values() {
                codegen::deno::apply(tg, watch_path.clone());
            }

            let tgs = TypegraphLoader::new()
                .serialized()
                .load_files(paths)
                .unwrap();
            reload_typegraphs(tgs, "127.0.0.1:7890".to_string()).unwrap();
        })
        .unwrap();

        let server = Server::http("0.0.0.0:8000").unwrap();

        for request in server.incoming_requests() {
            let url = Url::parse(&format!("http://dummy{}", request.url()))?;
            let query: HashMap<String, String> = url.query_pairs().into_owned().collect();

            let response = match url.path() {
                "/dev" => match query.get("node") {
                    Some(node) => {
                        let tgs = TypegraphLoader::new()
                            .working_dir(&dir)
                            .serialized()
                            .load_all()?;
                        reload_typegraphs(tgs, node.to_owned())?;
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
    let mut watcher = recommended_watcher(move |res: Result<Event, notify::Error>| {
        let event = res.unwrap();
        let paths = get_paths(&event);

        if !paths.is_empty() {
            match event.kind {
                EventKind::Create(_)
                | EventKind::Remove(_)
                | EventKind::Modify(ModifyKind::Data(_))
                | EventKind::Modify(ModifyKind::Name(_)) => {
                    println!("file change {:?}", event);
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

fn reload_typegraphs(tgs: HashMap<String, String>, node: String) -> Result<()> {
    for tg in tgs {
        println!("pushing {}", tg.0);
        push_typegraph(tg.1, node.clone(), 3)?;
    }

    Ok(())
}

pub fn push_typegraph(tg: String, node: String, backoff: u32) -> Result<()> {
    let client = reqwest::blocking::Client::new();
    let tg = serde_json::Value::String(tg).to_string();
    let payload = json!({
      "operationName": "insert",
      "variables": {},
      "query": format!("query insert {{ addTypegraph(fromString: {}) {{ name }}}}", tg)
    });

    let query = client
        .post(format!("http://{}/typegate", node))
        .timeout(Duration::from_secs(5))
        .json(&payload)
        .send();
    match query {
        Err(_) if backoff > 1 => {
            println!("retry");
            sleep(Duration::from_secs(10));
            push_typegraph(tg, node, backoff - 1)
        }
        Err(_) => Err(Error::msg(format!("node {} unreachable", node))),
        _ => Ok(()),
    }
}
