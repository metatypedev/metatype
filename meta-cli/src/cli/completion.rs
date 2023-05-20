// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{anyhow, Result};
use async_trait::async_trait;
use clap::CommandFactory;
use clap::Parser;
use clap::ValueEnum;
use clap_complete::generate;
use clap_complete::Shell;
use itertools::Itertools;

use super::Action;
use super::Args;
use super::GenArgs;

#[derive(Parser, Debug)]
pub struct Completion {
    #[arg(long, value_enum)]
    pub shell: Option<Shell>,
}

#[async_trait]
impl Action for Completion {
    async fn run(&self, _args: GenArgs) -> Result<()> {
        let mut cmd = Args::command();
        let name = cmd.get_name().to_string();
        match self.shell.or_else(Shell::from_env) {
            Some(shell) => generate(shell, &mut cmd, name, &mut std::io::stdout()),
            None => {
                return Err(anyhow!(
                    "Unable to detect shell, please specify it using --shell <{}>",
                    Vec::from(Shell::value_variants())
                        .into_iter()
                        .map(|s| s.to_string())
                        .join("|")
                ))
            }
        }
        Ok(())
    }
}
