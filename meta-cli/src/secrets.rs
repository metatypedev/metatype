// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::config::NodeConfig;
use anyhow::{bail, Result};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct Secrets(HashMap<String, String>);

impl Secrets {
    pub fn load_from_node_config(node_config: &NodeConfig) -> Result<Self> {
        let mut secrets = HashMap::new();

        for env in &node_config.env {
            secrets.insert(env.0.clone(), env.1.clone());
        }

        for (tg_name, tg_secrets) in &node_config.secrets {
            for (key, value) in tg_secrets {
                secrets.insert(encode_secret_env_key(tg_name, key), value.clone());
            }
        }

        Ok(Self(secrets))
    }

    pub fn apply_overrides(&mut self, overrides: &[String]) -> Result<()> {
        for override_str in overrides {
            let mut parts = override_str.splitn(2, '=');
            let key = parts.next().unwrap();
            let value = parts.next();
            let Some(value) = value else {
                bail!("Invalid secret override (key only): {}", override_str);
            };

            self.0.insert(key.to_string(), value.to_string());
        }

        Ok(())
    }

    pub async fn hydrate(self, dir: std::path::PathBuf) -> Result<HashMap<String, String>> {
        lade_sdk::hydrate(self.0, dir).await
    }
}

// TODO fail on invalid characters -- what are valid characters?
fn encode_secret_env_key(tg_name: &str, key: &str) -> String {
    let mut res = "TG_".to_string();

    for ch in tg_name.chars() {
        if !ch.is_ascii_alphanumeric() {
            res.push('_');
        } else {
            res.extend(ch.to_uppercase());
        }
    }

    res.push('_');

    for ch in key.chars() {
        if !ch.is_ascii_alphanumeric() {
            res.push('_');
        } else {
            res.extend(ch.to_uppercase());
        }
    }

    res
}
