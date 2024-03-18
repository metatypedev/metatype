// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::global_config::GlobalConfig;

use super::{Action, GenArgs};
use crate::build;
use actix_web::dev::ServerHandle;
use anyhow::{Ok, Result};
use async_trait::async_trait;
use chrono::{Duration, Utc};
use clap::Parser;
use self_update::{backends::github::Update, update::UpdateStatus};
use semver::Version;

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
    async fn run(&self, _args: GenArgs, _: Option<ServerHandle>) -> Result<()> {
        // https://github.com/jaemk/self_update/issues/44
        let opts = self.clone();
        tokio::task::spawn_blocking(move || {
            let mut update = Update::configure();
            update
                .repo_owner("metatypedev")
                .repo_name("metatype")
                .bin_name("meta")
                .show_download_progress(true)
                .current_version(build::PKG_VERSION)
                .no_confirm(opts.yes);

            if let Some(version) = opts.version {
                update.target_version_tag(&format!("v{version}"));
            }

            match update.build()?.update_extended()? {
                UpdateStatus::UpToDate => println!("Already up to date!"),
                UpdateStatus::Updated(release) => {
                    println!("Updated successfully to {}!", release.version);
                    println!(
                        "Release notes: https://github.com/metatypedev/metatype/releases/tag/{}",
                        release.name
                    );
                }
            };
            Ok(())
        })
        .await??;
        Ok(())
    }
}

pub async fn upgrade_check() -> Result<()> {
    let config_path = GlobalConfig::default_path()?;
    let mut local_config = GlobalConfig::load(&config_path).await?;

    if local_config.update_check + Duration::try_days(1).unwrap() < Utc::now() {
        let current_version = build::PKG_VERSION;
        let latest = tokio::task::spawn_blocking(move || {
            let update = Update::configure()
                .repo_owner("metatypedev")
                .repo_name("metatype")
                .bin_name("meta")
                .current_version(current_version)
                .build()?;

            Ok(update.get_latest_release()?)
        })
        .await??;

        if Version::parse(&latest.version)? > Version::parse(current_version)? {
            println!(
                "New meta update available: {} -> {} (use: meta upgrade)",
                current_version, latest.version
            );
        }

        local_config.update_check = Utc::now();
        local_config.save(config_path).await?;
    }
    Ok(())
}
