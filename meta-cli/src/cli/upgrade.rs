// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::{Action, GenArgs};
use anyhow::{Ok, Result};
use async_trait::async_trait;
use clap::Parser;
use common::get_version;
use self_update::backends::github::Update;

#[derive(Parser, Debug, Clone)]
pub struct Upgrade {
    /// Upgrade to specific version (e.g. 1.0.0)
    #[clap(long)]
    version: Option<String>,

    /// Do not ask for version confirmation
    #[clap(short, long, default_value_t = false)]
    yes: bool,
}

#[async_trait]
impl Action for Upgrade {
    async fn run(&self, _args: GenArgs) -> Result<()> {
        // https://github.com/jaemk/self_update/issues/44
        let opts = self.clone();
        let status = tokio::task::spawn_blocking(move || {
            let mut update = Update::configure();
            update
                .repo_owner("metatypedev")
                .repo_name("metatype")
                .bin_name("meta")
                .show_download_progress(true)
                .current_version(&get_version())
                .no_confirm(opts.yes);

            if let Some(version) = opts.version {
                update.target_version_tag(&format!("v{version}"));
            }

            let status = update.build()?.update()?;
            Ok(status)
        })
        .await??;
        println!("Update status: `{}`!", status.version());
        Ok(())
    }
}
