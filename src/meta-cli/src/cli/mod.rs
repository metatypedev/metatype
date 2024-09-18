// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

use crate::utils::clap::UrlValueParser;
use clap::Parser;
use clap::Subcommand;
use clap_verbosity_flag::Verbosity;
use enum_dispatch::enum_dispatch;
use normpath::PathExt;
use reqwest::Url;

mod ui;

pub(crate) mod completion;
pub(crate) mod deploy;
pub(crate) mod dev;
pub(crate) mod doctor;
pub(crate) mod gen;
pub(crate) mod list;
pub(crate) mod mdk_template;
pub(crate) mod new;
pub(crate) mod serialize;
pub(crate) mod typegate;
pub(crate) mod undeploy;
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
    pub config: ConfigArgs,
}

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None, disable_version_flag = true)]
pub struct ConfigArgs {
    #[clap(short = 'C', long, value_parser, default_value = ".")]
    dir: PathBuf,

    /// path to the config file
    #[clap(long, value_parser)]
    pub config: Option<PathBuf>,
}

impl ConfigArgs {
    pub fn dir(&self) -> Result<PathBuf> {
        Ok(self
            .dir
            .normalize()
            .wrap_err(
                "error normalizing working directory, make sure any override working dir exists.",
            )?
            .into_path_buf())
    }
}

#[derive(Subcommand, Debug)]
#[enum_dispatch]
pub(crate) enum Commands {
    /// Serialize the typegraphs defined in the specified python file(s) into JSON.
    Serialize(serialize::Serialize),
    /// Push typegraph(s) with development mode features enabled
    Dev(dev::Dev),
    /// Push typegraph(s) to typegate
    Deploy(deploy::DeploySubcommand),
    /// Undeploy typegraph(s) from typegate
    Undeploy(undeploy::Undeploy),
    /// List typegraph(s) from typegate
    List(list::List),
    /// Access metagen generators
    Gen(gen::Gen),
    /// Upgrade
    Upgrade(upgrade::Upgrade),
    /// Generate shell completion
    Completion(completion::Completion),
    /// Troubleshoot the installation
    Doctor(doctor::Doctor),
    /// Create a new Metatype project
    New(new::New),
    /// Dump the default mdk template
    MdkTemplate(mdk_template::CreateMdkTemplate),
    /// Access a minimal deno CLI
    Typegate(typegate::Typegate),
}

#[async_trait]
#[enum_dispatch(Commands)]
pub trait Action {
    async fn run(&self, args: ConfigArgs) -> Result<()>;
}

#[derive(Parser, Debug, Clone)]
pub struct NodeArgs {
    /// Address of the typegate.
    #[clap(short, long, value_parser = UrlValueParser::new().http())]
    pub gate: Option<Url>,

    #[clap(short, long)]
    pub prefix: Option<String>,

    /// Username to use to connect to the typegate (basic auth).
    #[clap(long)]
    pub username: Option<String>,

    /// Password to use to connect to the typegate (basic auth).
    #[clap(long)]
    pub password: Option<String>,
}
