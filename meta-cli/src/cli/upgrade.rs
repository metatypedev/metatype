// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use common::get_version;

use super::{Action, GenArgs};

#[derive(Parser, Debug)]
pub struct Upgrade {}

#[async_trait]
impl Action for Upgrade {
    async fn run(&self, _args: GenArgs) -> Result<()> {
        let status = self_update::backends::github::Update::configure()
            .repo_owner("metatypedev")
            .repo_name("metatype")
            .bin_name("meta")
            .show_download_progress(true)
            .current_version(&get_version())
            .build()?
            .update()?;
        println!("Update status: `{}`!", status.version());
        Ok(())
    }
}
