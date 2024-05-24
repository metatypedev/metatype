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
            Commands::Bench(cmd) => cmd.run()?,
        }
        Ok(())
    }
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    // Run deno tests with the metatype extension support
    Test(Test),
    // Run deno benches with the metatype extension support
    Bench(Bench),
}

#[derive(Parser, Debug)]
pub struct Test {
    /// Files to test
    files: Option<Vec<PathBuf>>,
    /// Test files to ignore
    #[clap(long)]
    ignore: Option<Vec<PathBuf>>,
    /// Path to `deno.json`
    #[clap(long)]
    config: PathBuf,
    /// The directory in which to put the coverage profiles
    #[clap(long)]
    coverage: Option<String>,
    #[clap(last = true)]
    argv: Vec<String>,
}

impl Test {
    fn run(self) -> Result<()> {
        let permissions = mt_deno::deno::deno_runtime::permissions::PermissionsOptions {
            allow_run: Some(
                [
                    "cargo", "hostname", "meta", "git", "python3", "rm", "mkdir", "bash", "npm",
                    "pnpm", "setsid", "temporal", "deno",
                ]
                .into_iter()
                .map(str::to_owned)
                .collect(),
            ),
            allow_sys: Some(vec![]),
            allow_env: Some(vec![]),
            allow_hrtime: true,
            allow_write: Some(vec![]),
            allow_ffi: Some(vec![]),
            allow_read: Some(vec![]),
            allow_net: Some(vec![]),
            ..Default::default()
        };
        let inj = typegate_engine::OpDepInjector::from_env();
        use mt_deno::deno::deno_config;
        mt_deno::test_sync(
            deno_config::glob::FilePatterns {
                base: std::env::current_dir()?,
                include: self.files.map(|vec| {
                    deno_config::glob::PathOrPatternSet::new(
                        vec.into_iter()
                            .map(deno_config::glob::PathOrPattern::Path)
                            .collect(),
                    )
                }),
                exclude: deno_config::glob::PathOrPatternSet::new(
                    self.ignore
                        .unwrap_or_default()
                        .into_iter()
                        .map(deno_config::glob::PathOrPattern::Path)
                        .collect(),
                ),
            },
            self.config,
            permissions,
            self.coverage,
            std::sync::Arc::new(move || typegate_engine::extensions(inj.clone())),
            self.argv,
        );
        Ok(())
    }
}

#[derive(Parser, Debug)]
pub struct Bench {
    /// Files to bench
    files: Option<Vec<PathBuf>>,
    /// Bench files to ignore
    #[clap(long)]
    ignore: Option<Vec<PathBuf>>,
    /// Path to `deno.json`
    #[clap(long)]
    config: PathBuf,
    #[clap(last = true)]
    argv: Vec<String>,
}

impl Bench {
    fn run(self) -> Result<()> {
        let permissions = mt_deno::deno::deno_runtime::permissions::PermissionsOptions {
            allow_run: Some(
                [
                    "cargo",
                    "hostname",
                    "target/debug/meta",
                    "git",
                    "python3",
                    "rm",
                    "mkdir",
                    "bash",
                ]
                .into_iter()
                .map(str::to_owned)
                .collect(),
            ),
            allow_sys: Some(vec![]),
            allow_env: Some(vec![]),
            allow_hrtime: true,
            allow_write: Some(
                ["tmp", "typegate/tests"]
                    .into_iter()
                    .map(std::str::FromStr::from_str)
                    .collect::<Result<_, _>>()?,
            ),
            allow_ffi: Some(vec![]),
            allow_read: Some(vec![]),
            allow_net: Some(vec![]),
            ..Default::default()
        };
        let inj = typegate_engine::OpDepInjector::from_env();
        use mt_deno::deno::deno_config;
        mt_deno::bench_sync(
            deno_config::glob::FilePatterns {
                base: std::env::current_dir()?,
                include: self.files.map(|vec| {
                    deno_config::glob::PathOrPatternSet::new(
                        vec.into_iter()
                            .map(deno_config::glob::PathOrPattern::Path)
                            .collect(),
                    )
                }),
                exclude: deno_config::glob::PathOrPatternSet::new(
                    self.ignore
                        .unwrap_or_default()
                        .into_iter()
                        .map(deno_config::glob::PathOrPattern::Path)
                        .collect(),
                ),
            },
            self.config,
            permissions,
            std::sync::Arc::new(move || typegate_engine::extensions(inj.clone())),
            self.argv,
        );
        Ok(())
    }
}
