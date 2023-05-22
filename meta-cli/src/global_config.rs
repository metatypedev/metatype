// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{Ok, Result};
use chrono::{DateTime, Utc};

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use tokio::fs;

#[derive(Deserialize, Serialize)]
pub struct GlobalConfig {
    pub update_check: DateTime<Utc>,
}

impl GlobalConfig {
    pub fn default_path() -> Result<PathBuf> {
        let project = directories::ProjectDirs::from("dev", "metatype", "meta")
            .expect("cannot get directory for project");

        Ok(project.config_local_dir().join("config.json"))
    }

    pub async fn load<P: AsRef<Path>>(path: P) -> Result<Self> {
        if path.as_ref().exists() {
            let config_str = fs::read_to_string(path).await?;
            let config: GlobalConfig = serde_yaml::from_str(&config_str)?;
            Ok(config)
        } else {
            let config = GlobalConfig {
                update_check: Utc::now(),
            };
            config.save(path).await?;
            Ok(config)
        }
    }

    pub async fn save<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let config_str = serde_yaml::to_string(&self)?;
        fs::create_dir_all(path.as_ref().parent().unwrap()).await?;
        fs::write(path, config_str).await?;
        Ok(())
    }
}
