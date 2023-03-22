// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use crate::utils::clap::UrlValueParser;
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use reqwest::Url;
use std::path::PathBuf;

pub mod codegen;
pub mod deploy;
pub mod dev;
pub mod prisma;
pub mod serialize;

#[async_trait]
pub trait Action {
    async fn run(&self, dir: String, config_path: Option<PathBuf>) -> Result<()>;
}

#[derive(Parser, Debug)]
pub struct CommonArgs {
    /// Address of the typegate.
    #[clap(short, long, value_parser = UrlValueParser::new().http())]
    pub gate: Option<Url>,

    /// Username to use to connect to the typegate (basic auth).
    #[clap(long)]
    pub username: Option<String>,

    /// Password to use to connect to the typegate (basic auth).
    /// Ignored if --username is missing.
    #[clap(long)]
    pub password: Option<String>,
}
