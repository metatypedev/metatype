// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

pub mod clap;
pub mod graphql;

use anyhow::{bail, Result};
use dialoguer::{Input, Password};
use pathdiff::diff_paths;
use reqwest::{Client, IntoUrl, RequestBuilder, Url};
use std::env::{set_var, var};
use std::fs;
use std::hash::Hash;
use std::path::Path;
use std::time::Duration;
use std::{collections::HashMap, path::PathBuf};

#[cfg(not(target_os = "windows"))]
pub fn strip_unc_prefix(path: &Path) -> &Path {
    path
}

#[cfg(target_os = "windows")]
pub fn strip_unc_prefix(path: &Path) -> &Path {
    let path_str = path.to_str().unwrap();
    let prefix = r"\\?\";
    if path_str.starts_with(prefix) {
        let path_str = &path_str[prefix.len()..];
        &Path::new(path_str)
    } else {
        path
    }
}

pub fn ensure_venv<P: AsRef<Path>>(dir: P) -> Result<()> {
    if var("VIRTUAL_ENV").is_ok() {
        return Ok(());
    }

    let dir = fs::canonicalize(dir)?;
    let venv_dir = dir.join(".venv");

    if venv_dir.is_dir() {
        let venv_dir = strip_unc_prefix(&venv_dir);
        let venv = venv_dir.to_str().unwrap();

        let path = var("PATH")?;

        // https://github.com/pypa/virtualenv/commit/993ba1316a83b760370f5a3872b3f5ef4dd904c1
        #[cfg(target_os = "windows")]
        let path = format!(
            "{venv_bin};{path}",
            venv_bin = venv_dir.join("Scripts").to_str().unwrap()
        );
        #[cfg(not(target_os = "windows"))]
        let path = format!(
            "{venv_bin}:{path}",
            venv_bin = venv_dir.join("bin").to_str().unwrap()
        );

        set_var("VIRTUAL_ENV", venv);
        set_var("PATH", path);
        Ok(())
    } else if let Some(dir) = dir.parent() {
        ensure_venv(dir)
    } else {
        bail!("Python venv required")
    }
}

#[derive(Clone, Debug)]
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

pub struct Node {
    base_url: Url,
    auth: Option<BasicAuth>,
}

impl Node {
    pub fn new<U: IntoUrl>(url: U, auth: Option<BasicAuth>) -> Result<Self> {
        Ok(Self {
            base_url: url.into_url()?,
            auth,
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

pub fn relative_path_display<P1: Into<PathBuf>, P2: Into<PathBuf>>(base: P1, path: P2) -> String {
    let path: PathBuf = path.into();
    diff_paths(&path, base.into())
        .unwrap_or(path)
        .display()
        .to_string()
}
