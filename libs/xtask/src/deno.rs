// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::Result;
use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser, Debug)]
pub struct Deno {
    #[clap(subcommand)]
    pub command: Commands,
}

impl Deno {
    pub fn run(self) -> Result<()> {
        match self.command {
            Commands::Test(cmd) => cmd.run()?,
        }
        Ok(())
    }
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    // Run deno tests with the metatype extension support
    Test(Test),
}

#[derive(Parser, Debug)]
pub struct Test {
    /// Files to test
    #[clap(long)]
    files: Option<Vec<PathBuf>>,
    /// Test files to ignore
    #[clap(long)]
    ignore: Option<Vec<PathBuf>>,
}

impl Test {
    fn run(self) -> Result<()> {
        mt_deno::test_sync(mt_deno::deno::deno_config::FilesConfig {
            include: self.files,
            exclude: self.ignore.unwrap_or_default(),
        });
        Ok(())
    }
}
