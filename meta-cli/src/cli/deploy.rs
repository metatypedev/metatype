// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::{dev::push_loaded_typegraphs, Action};
use crate::utils::{ensure_venv, Node};
use crate::{typegraph::TypegraphLoader, utils::BasicAuth};
use anyhow::Result;
use clap::Parser;
use std::collections::HashMap;

#[derive(Parser, Debug)]
pub struct Deploy {
    /// Name of the person to greet
    #[clap(short, long, value_parser)]
    file: Option<String>,

    /// Typegate url
    #[clap(short, long, value_parser, default_value_t = String::from("http://localhost:7890"))]
    gate: String,
}

impl Action for Deploy {
    fn run(&self, dir: String) -> Result<()> {
        ensure_venv(&dir)?;
        let loader = TypegraphLoader::new();

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

        let node = Node::new(&self.gate, Some(BasicAuth::prompt()?))?;

        push_loaded_typegraphs(loaded, &node);

        Ok(())
    }
}
