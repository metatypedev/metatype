// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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
        mt_deno::deno::util::v8::init_v8_flags(
            &[],
            &[],
            mt_deno::deno::util::v8::get_v8_flags_from_env(),
        );
        let permissions = mt_deno::deno::deno_runtime::deno_permissions::PermissionsOptions {
            // we need to allow-run for all to avoid
            // https://github.com/denoland/deno/issues/26839
            allow_run: Some(
                vec![
                    //"cargo",
                    //"hostname",
                    //"meta",
                    //"meta-full",
                    //"meta-old",
                    //"git",
                    //"python3",
                    //"rm",
                    //"mkdir",
                    //"bash",
                    //"npm",
                    //"pnpm",
                    //"setsid",
                    //"temporal",
                    //"deno",
                    //"poetry",
                    //"xtask",
                    //"env",
                    //"ls",
                ], //.into_iter()
                   //.map(str::to_owned)
                   //.collect(),
            ),
            allow_sys: Some(vec![]),
            allow_env: Some(vec![]),
            allow_write: Some(vec![]),
            allow_ffi: Some(vec![]),
            allow_read: Some(vec![]),
            allow_net: Some(vec![]),
            allow_import: Some(
                vec![
                    //// based on deno cli defaults
                    //"deno.land:443",
                    //"jsr.io:443",
                    //"esm.sh:443",
                    //"cdn.jsdelivr.net:443",
                    //"raw.githubusercontent.com:443",
                    //"user.githubusercontent.com:443",
                ], //.into_iter()
                   //.map(str::to_owned)
                   //.collect(),
            ),
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
