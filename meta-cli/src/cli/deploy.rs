// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::{dev::push_loaded_typegraphs, Action};
use crate::config::Config;
use crate::typegraph::TypegraphLoader;
use crate::utils::clap::UrlValueParser;
use crate::utils::{ensure_venv, Node};
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use reqwest::Url;
use std::collections::HashMap;
use std::path::PathBuf;

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
        let loader = TypegraphLoader::with_config(&config);

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

        push_loaded_typegraphs(dir, loaded, &node).await;

        Ok(())
    }
}
