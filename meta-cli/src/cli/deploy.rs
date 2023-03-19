// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::Action;
use crate::cli::dev::{push_typegraph, MessageType};
use crate::config::Config;
use crate::typegraph::{LoaderResult, TypegraphLoader};
use crate::utils::clap::UrlValueParser;
use crate::utils::{self, ensure_venv, Node};
use anyhow::{bail, Context, Result};
use async_trait::async_trait;
use clap::Parser;
use colored::Colorize;
use reqwest::Url;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Parser, Debug)]
pub struct Deploy {
    /// Load specific typegraph from a file
    #[clap(short, long)]
    file: Option<String>,

    /// Typegate url
    #[clap(short, long, value_parser = UrlValueParser::new().http())]
    gate: Option<Url>,

    /// Username
    #[clap(short, long)]
    username: Option<String>,

    /// Password
    #[clap(short, long)]
    password: Option<String>,
}

#[async_trait]
impl Action for Deploy {
    async fn run(&self, dir: String, config_path: Option<PathBuf>) -> Result<()> {
        ensure_venv(&dir)?;
        let config = Config::load_or_find(config_path, &dir)?;
        let loader = TypegraphLoader::with_config(&config).deploy(true);

        let loaded = if let Some(file) = self.file.clone() {
            let mut ret = HashMap::default();
            let res = loader.load_file(&file);
            match res {
                Ok(Some(tgs)) => {
                    ret.insert(file, Ok(tgs));
                }
                Ok(None) => (),
                Err(err) => {
                    ret.insert(file, Err(err));
                }
            }
            ret
        } else {
            loader.load_folder(&dir)?
        };

        let node_config = config.node("deploy");
        let node_url = node_config.url(self.gate.clone());

        let auth = node_config
            .basic_auth(self.username.clone(), self.password.clone())
            .await?;

        let node = Node::new(node_url, Some(auth))?;

        deploy_loaded_typegraphs(dir, loaded, &node).await?;

        Ok(())
    }
}

async fn deploy_loaded_typegraphs(dir: String, loaded: LoaderResult, node: &Node) -> Result<()> {
    let diff_base = Path::new(&dir).to_path_buf().canonicalize().unwrap();

    for (path, res) in loaded.into_iter() {
        let tgs = res.with_context(|| format!("Error while loading typegrpahs from {path}"))?;
        let path = utils::relative_path_display(diff_base.clone(), path);
        println!(
            "Loading {count} typegraphs{s} from {path}:",
            count = tgs.len(),
            s = utils::plural_prefix(tgs.len())
        );
        for tg in tgs.iter() {
            println!(
                "  → Pushing typegraph {name}...",
                name = tg.name().unwrap().blue()
            );
            match push_typegraph(tg, node, 0).await {
                Ok(res) => {
                    println!("  {}", "✓ Success!".to_owned().green());
                    let name = res.name;
                    for msg in res.messages.into_iter() {
                        let type_ = match msg.type_ {
                            MessageType::Info => "info".blue(),
                            MessageType::Warning => "warn".yellow(),
                            MessageType::Error => "error".red(),
                        };
                        let tg_name = name.green();
                        println!("    [{tg_name} {type_}] {}", msg.text);
                    }
                }
                Err(e) => {
                    println!("  {}", "✗ Failed!".to_owned().red());
                    bail!(e);
                }
            }
        }
    }

    Ok(())
}
