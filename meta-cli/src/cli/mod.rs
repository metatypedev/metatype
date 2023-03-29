// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use crate::utils::clap::UrlValueParser;
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use clap::Subcommand;
use clap_verbosity_flag::Verbosity;
use enum_dispatch::enum_dispatch;
use reqwest::Url;
use std::path::PathBuf;

pub(crate) mod codegen;
pub(crate) mod completion;
pub(crate) mod deploy;
pub(crate) mod dev;
pub(crate) mod prisma;
pub(crate) mod serialize;
pub(crate) mod upgrade;

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None, disable_version_flag = true)]
pub(crate) struct Args {
    #[clap(long, value_parser)]
    pub version: bool,

    #[command(flatten)]
    pub verbose: Verbosity,

    #[clap(subcommand)]
    pub command: Option<Commands>,

    #[clap(flatten)]
    pub gen: GenArgs,
}

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None, disable_version_flag = true)]
pub struct GenArgs {
    #[clap(short = 'C', long, value_parser, default_value_t = String::from("."))]
    pub dir: String,

    /// path to the config file
    #[clap(long, value_parser)]
    pub config: Option<PathBuf>,
}

#[derive(Subcommand, Debug)]
#[enum_dispatch]
pub(crate) enum Commands {
    /// Serialize the typegraphs defined in the specified python file(s) into JSON.
    Serialize(serialize::Serialize),
    /// Manage prisma migration
    Prisma(prisma::Prisma),
    /// Push typegraph(s) with development mode features enabled
    Dev(dev::Dev),
    /// Push typegraph(s) to typegate
    Deploy(deploy::Deploy),
    /// Generate materializers code from typegraph definition
    Codegen(codegen::Codegen),
    /// Upgrade
    Upgrade(upgrade::Upgrade),
    /// Generate shell completion
    Completion(completion::Completion),
}

#[async_trait]
#[enum_dispatch(Commands)]
pub trait Action {
    async fn run(&self, args: GenArgs) -> Result<()>;
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
