use anyhow::{Error, Ok, Result};
use ignore::Match;
use notify::event::ModifyKind;
use notify::{recommended_watcher, Config, Event, EventKind, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use std::thread::sleep;
use std::time::Duration;

use clap::Parser;
use globset::Glob;
use ignore::gitignore::Gitignore;
use indoc::formatdoc;
use reqwest::{self, Url};
use serde_json::{self, json};
use tiny_http::{Header, Response, Server};

use super::Action;

#[derive(Parser, Debug)]
pub struct Dev {}

impl Action for Dev {
    fn run(&self, dir: String) -> Result<()> {
        let tgs = collect_typegraphs(dir.clone(), None)?;
        reload_typegraphs(tgs, "127.0.0.1:7890".to_string())?;

        let gi = Gitignore::new(Path::new(".gitignore")).0;
        let gs = Glob::new("*.py").unwrap().compile_matcher();

        let watch_patch = dir.clone();
        let mut watcher = recommended_watcher(move |res: Result<Event, notify::Error>| {
            let event = res.unwrap();

            let paths = event
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
                .collect::<Vec<_>>();

            if !paths.is_empty() {
                match event.kind {
                    EventKind::Create(_)
                    | EventKind::Remove(_)
                    | EventKind::Modify(ModifyKind::Data(_))
                    | EventKind::Modify(ModifyKind::Name(_)) => {
                        println!("file change {:?}", event);
                        let tgs = collect_typegraphs(watch_patch.clone(), None).unwrap();
                        reload_typegraphs(tgs, "127.0.0.1:7890".to_string()).unwrap();
                    }
                    _ => {}
                }
            }
        })
        .unwrap();

        watcher
            .configure(Config::OngoingEvents(Some(Duration::from_secs(1))))
            .unwrap();
        watcher.configure(Config::PreciseEvents(false)).unwrap();

        watcher
            .watch(Path::new(&dir), RecursiveMode::Recursive)
            .unwrap();

        let server = Server::http("0.0.0.0:8000").unwrap();

        for request in server.incoming_requests() {
            let url = Url::parse(&format!("http://dummy{}", request.url()))?;
            let query: HashMap<String, String> = url.query_pairs().into_owned().collect();

            let response = match url.path() {
                "/dev" => match query.get("node") {
                    Some(node) => {
                        let tgs = collect_typegraphs(dir.clone(), None)?;
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

pub fn collect_typegraphs(
    path: String,
    custom_loader: Option<String>,
) -> Result<HashMap<String, String>> {
    let cwd = Path::new(&path);
    let venv = cwd.join(Path::new(".venv"));
    if !venv.exists() {
        return Err(Error::msg(
            "No venv found, create one with `python3.10 -m venv .venv`".to_string(),
        ));
    }

    let test = Command::new(format!("{}/bin/python", venv.to_string_lossy()))
        .arg("-c")
        .arg(formatdoc!(
            r#"
        from typegraph.utils import loaders
        from typegraph import dist
        import orjson
        tgs = {dist}
        serialized_tgs = {{tg.name: loaders.serialize_typegraph(tg) for tg in tgs}}
        print(orjson.dumps(serialized_tgs).decode())
        "#,
            dist = match custom_loader {
                Some(loader) => loader,
                None => r#"loaders.import_folder(".") + loaders.import_modules(dist)"#.to_string(),
            }
        ))
        .current_dir(cwd)
        .output()?;

    if !test.status.success() {
        let message = String::from_utf8(test.stderr)?;

        if message.contains("ModuleNotFoundError: No module named 'typegraph'") {
            return Err(Error::msg(
                "typegraph module not found in venv, install it with `pip install typegraph`",
            ));
        }

        return Err(Error::msg(message));
    }

    let payload = String::from_utf8(test.stdout)?;
    let tgs: HashMap<String, String> = serde_json::from_str(&payload)?;
    Ok(tgs)
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
    let payload = json!({
      "operationName": "insert",
      "variables": {},
      "query": tg
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
