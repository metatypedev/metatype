// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use tokio::sync::Mutex;

use crate::config::NodeConfig;
use crate::interlude::*;

lazy_static::lazy_static! {
    static ref CACHED_SECRETS: Mutex<HashMap<String, HashMap<String, String>>> = Mutex::new(HashMap::new());
}

// tg_name -> key -> value
#[derive(Debug, Clone, Default)]
pub struct Secrets {
    by_typegraph: HashMap<String, HashMap<String, String>>,
    overrides: HashMap<String, String>,
    path: PathBuf,
}

pub type RawSecrets = Secrets;

struct SecretOverride<'a> {
    tg_name: Option<&'a str>,
    key: &'a str,
    value: &'a str,
}

impl<'a> SecretOverride<'a> {
    pub fn from_str(override_str: &'a str) -> Result<Self> {
        let mut parts = override_str.splitn(2, '=');
        let (tg_name, key) = Self::parse_key(parts.next().unwrap());
        let value = parts.next();

        let value = value
            .ok_or_else(|| ferr!("invalid secret override (missing value): {override_str}"))?;

        Ok(Self {
            tg_name,
            key,
            value,
        })
    }

    fn parse_key(key: &str) -> (Option<&str>, &str) {
        let mut parts = key.splitn(2, ':');
        let first = parts.next().unwrap();

        if let Some(second) = parts.next() {
            (Some(first), second)
        } else {
            (None, first)
        }
    }
}

impl Secrets {
    pub fn load_from_node_config(node_config: &NodeConfig, path: PathBuf) -> Secrets {
        Secrets {
            by_typegraph: node_config.secrets.clone(),
            overrides: HashMap::new(),
            path,
        }
    }

    pub fn apply_overrides(&mut self, overrides: &[String]) -> Result<()> {
        for override_str in overrides {
            let SecretOverride {
                tg_name,
                key,
                value,
            } = SecretOverride::from_str(override_str)?;

            if let Some(tg_name) = tg_name {
                if let Some(secrets) = self.by_typegraph.get_mut(tg_name) {
                    secrets.insert(key.to_string(), value.to_string());
                } else {
                    let mut tg_secrets = HashMap::new();
                    tg_secrets.insert(key.to_string(), value.to_string());
                    self.by_typegraph.insert(tg_name.to_string(), tg_secrets);
                }
            } else {
                self.overrides.insert(key.to_string(), value.to_string());
            }
        }

        Ok(())
    }

    pub async fn get(&self, tg_name: &str) -> Result<HashMap<String, String>> {
        let mut cache = CACHED_SECRETS.lock().await;
        if let Some(cached_result) = cache.get(tg_name) {
            return Ok(cached_result.clone());
        }

        let mut secrets = self.by_typegraph.get(tg_name).cloned().unwrap_or_default();

        lade_sdk::hydrate(secrets.clone(), self.path.clone())
            .await
            .map_err(anyhow_to_eyre!())
            .with_context(|| format!("error hydrating secrets for {tg_name}"))?;

        if !cache.contains_key("overrides") {
            let hydrated_overrides = lade_sdk::hydrate(self.overrides.clone(), self.path.clone())
                .await
                .map_err(|err| ferr!("error hydrating secrets overrides: {err}"))?;
            cache.insert("overrides".to_string(), hydrated_overrides);
        }

        if let Some(overrides) = cache.get("overrides") {
            for (key, value) in overrides {
                secrets.insert(key.clone(), value.clone());
            }
        }

        cache.insert(tg_name.to_string(), secrets.clone());

        Ok(secrets)
    }
}
