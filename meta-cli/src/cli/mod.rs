// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::clap::UrlValueParser;
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use clap::Subcommand;
use clap_verbosity_flag::Verbosity;
use enum_dispatch::enum_dispatch;
use normpath::PathExt;
use reqwest::Url;
use std::path::PathBuf;

mod ui;

pub(crate) mod codegen;
pub(crate) mod completion;
pub(crate) mod deploy;
pub(crate) mod dev;
pub(crate) mod doctor;
pub(crate) mod new;
pub(crate) mod prisma;
pub(crate) mod serialize;
#[cfg(feature = "typegate")]
pub(crate) mod typegate;
pub(crate) mod upgrade;

#[derive(Parser, Debug)]
#[clap(name="meta", about, long_about = None, disable_version_flag = true)]
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
    #[clap(short = 'C', long, value_parser, default_value = ".")]
    dir: PathBuf,

    /// path to the config file
    #[clap(long, value_parser)]
    pub config: Option<PathBuf>,
}

impl GenArgs {
    pub fn dir(&self) -> Result<PathBuf> {
        Ok(PathBuf::from(&self.dir).normalize()?.into_path_buf())
    }
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
    Deploy(deploy::DeploySubcommand),
    /// Generate materializers code from typegraph definition
    Codegen(codegen::Codegen),
    /// Upgrade
    Upgrade(upgrade::Upgrade),
    /// Generate shell completion
    Completion(completion::Completion),
    /// Troubleshoot the installation
    Doctor(doctor::Doctor),
    /// Create a new Metatype project
    New(new::New),
    /// Access a minimal deno CLI
    #[cfg(feature = "typegate")]
    Typegate(typegate::Typegate),
}

#[async_trait]
#[enum_dispatch(Commands)]
pub trait Action {
    async fn run(&self, args: GenArgs) -> Result<()>;
}

#[derive(Parser, Debug, Clone)]
pub struct CommonArgs {
    /// Address of the typegate.
    #[clap(short, long, value_parser = UrlValueParser::new().http())]
    pub gate: Option<Url>,

    /// Username to use to connect to the typegate (basic auth).
    #[clap(long)]
    pub username: Option<String>,

    /// Password to use to connect to the typegate (basic auth).
    #[clap(long)]
    pub password: Option<String>,
}
