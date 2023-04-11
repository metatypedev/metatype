// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

pub mod clap;
pub mod graphql;

use anyhow::{bail, Result};
use dialoguer::{Input, Password};
use reqwest::{Client, IntoUrl, RequestBuilder, Url};
use std::collections::HashMap;
use std::env::{set_var, var};
use std::hash::Hash;
use std::path::Path;
use std::time::Duration;

use crate::config::VENV_FOLDERS;
use crate::fs::find_in_parents;

pub fn ensure_venv<P: AsRef<Path>>(dir: P) -> Result<()> {
    if var("VIRTUAL_ENV").is_ok() {
        return Ok(());
    }

    if let Some(venv_dir) = find_in_parents(dir, VENV_FOLDERS)? {
        let path = var("PATH")?;

        // https://github.com/pypa/virtualenv/commit/993ba1316a83b760370f5a3872b3f5ef4dd904c1
        #[cfg(target_os = "windows")]
        let path = format!(
            "{venv_bin};{path}",
            venv_bin = venv_dir.as_path().join("Scripts").to_str().unwrap()
        );
        #[cfg(not(target_os = "windows"))]
        let path = format!(
            "{venv_bin}:{path}",
            venv_bin = venv_dir.as_path().join("bin").to_str().unwrap()
        );

        set_var("VIRTUAL_ENV", venv_dir.to_str().unwrap());
        set_var("PATH", path);
        Ok(())
    } else {
        bail!("Python venv required")
    }
}

#[derive(Debug, Clone)]
pub struct BasicAuth {
    username: String,
    password: String,
}

impl BasicAuth {
    pub fn new(username: String, password: String) -> Self {
        Self { username, password }
    }

    pub fn prompt() -> Result<Self> {
        let username = Input::new().with_prompt("Username").interact_text()?;
        let password = Password::new().with_prompt("Password").interact()?;
        Ok(Self { username, password })
    }

    pub fn prompt_as_user(username: String) -> Result<Self> {
        let password = Password::new()
            .with_prompt(format!("Password for user {username}"))
            .interact()?;
        Ok(Self { username, password })
    }
}

#[derive(Debug, Clone)]
pub struct Node {
    pub base_url: Url,
    auth: Option<BasicAuth>,
    pub env: HashMap<String, String>,
}

impl Node {
    pub fn new<U: IntoUrl>(
        url: U,
        auth: Option<BasicAuth>,
        env: HashMap<String, String>,
    ) -> Result<Self> {
        Ok(Self {
            base_url: url.into_url()?,
            auth,
            env,
        })
    }

    pub fn post(&self, path: &str) -> Result<RequestBuilder> {
        let mut b = Client::new().post(self.base_url.join(path)?);
        if let Some(auth) = &self.auth {
            b = b.basic_auth(&auth.username, Some(&auth.password));
        }
        Ok(b.timeout(Duration::from_secs(5)))
    }
}

pub trait MapValues<K, V, W, O>: IntoIterator<Item = (K, V)>
where
    // K: Eq,
    O: FromIterator<(K, W)>,
{
    fn map_values<M>(self, f: M) -> O
    where
        M: Fn(V) -> W;
}

impl<K, V, W> MapValues<K, V, W, HashMap<K, W>> for HashMap<K, V>
where
    K: Eq + Hash,
{
    fn map_values<M>(self, f: M) -> HashMap<K, W>
    where
        M: Fn(V) -> W,
    {
        self.into_iter().map(|(k, v)| (k, f(v))).collect()
    }
}
