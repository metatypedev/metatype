// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::config::NodeConfig;
use anyhow::{anyhow, Result};
use std::{collections::HashMap, path::Path, sync::Arc};

#[derive(Debug, Clone)]
pub struct Raw;
#[derive(Debug, Clone, Default)]
pub struct Hydrated;

// tg_name -> key -> value
#[derive(Debug, Clone, Default)]
pub struct Secrets<T = Hydrated> {
    by_typegraph: HashMap<String, HashMap<String, String>>,
    overrides: HashMap<String, String>,
    _type_state: std::marker::PhantomData<T>,
}

pub type RawSecrets = Secrets<Raw>;

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
            .ok_or_else(|| anyhow!("Invalid secret override (missing value): {}", override_str))?;

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

impl Secrets<Raw> {
    pub fn load_from_node_config(node_config: &NodeConfig) -> Secrets<Raw> {
        Secrets {
            by_typegraph: node_config.secrets.clone(),
            overrides: HashMap::new(),
            _type_state: std::marker::PhantomData,
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

    pub async fn hydrate(self, dir: Arc<Path>) -> Result<Secrets<Hydrated>> {
        let by_typegraph: HashMap<String, _> =
            futures::future::join_all(self.by_typegraph.into_iter().map(|(tg_name, secrets)| {
                let dir = dir.clone();
                async move {
                    let secrets = lade_sdk::hydrate(secrets, dir.clone().to_path_buf()).await?;
                    Ok((tg_name, secrets))
                }
            }))
            .await
            .into_iter()
            .collect::<Result<_>>()?;

        let overrides = lade_sdk::hydrate(self.overrides, dir.to_path_buf()).await?;

        Ok(Secrets {
            by_typegraph,
            overrides,
            _type_state: std::marker::PhantomData,
        })
    }
}

impl Secrets<Hydrated> {
    pub fn get(&self, tg_name: &str) -> HashMap<String, String> {
        let mut secrets = self.by_typegraph.get(tg_name).cloned().unwrap_or_default();

        for (key, value) in &self.overrides {
            secrets.insert(key.clone(), value.clone());
        }

        secrets
    }
}
