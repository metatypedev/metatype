// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{bail, Context, Result};
use std::path::PathBuf;
use std::process::{Command, Stdio};

fn get_workspace_root() -> Result<PathBuf> {
    let p = Command::new("cargo")
        .arg("metadata")
        .arg("--no-deps")
        .arg("--format-version")
        .arg("1")
        .stdout(Stdio::piped())
        .spawn()
        .context("read cargo metadata")?;
    let output = p
        .wait_with_output()
        .context("failed to get cargo metadata")?;

    use serde_json::Value;
    let metadata: Value = serde_json::from_str(std::str::from_utf8(&output.stdout)?)?;
    if let Value::Object(obj) = metadata {
        let workspace_root = obj.get("workspace_root").unwrap();
        if let Value::String(workspace_root) = workspace_root {
            return Ok(PathBuf::from(workspace_root));
        }
    }

    bail!("could not read workspace root from cargo metadata")
}

pub fn ensure_venv() -> Result<()> {
    crate::utils::ensure_venv(get_workspace_root()?.join("typegraph"))
}

/// assert that the `res` is an Error variant where the message contains `pat`
pub fn assert_err_contains<T>(res: Result<T>, pat: &str) {
    if let Err(e) = res {
        let error_message = e.to_string();
        if !error_message.contains(pat) {
            panic!("Assertion failure: error expected to contain {pat:?}, got: {error_message:?}");
        }
    } else {
        panic!("Assertion error: expected an Error variant, got an Ok variant.");
    }
}
