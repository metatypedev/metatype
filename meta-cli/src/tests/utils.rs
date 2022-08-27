use anyhow::{anyhow, Context, Result};
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

    Err(anyhow!("could not read workspace root from cargo metadata"))
}

pub fn ensure_venv() -> Result<()> {
    use std::env::{set_var, var};
    if let Err(_) = var("VIRTUAL_ENV") {
        let workspace_root = get_workspace_root()?;
        let venv = workspace_root.join("typegraph/.venv");
        let venv_bin = venv.join("bin");
        let venv = venv.to_str().unwrap();
        let venv_bin = venv_bin.to_str().unwrap();
        let path = var("PATH")?;
        set_var("VIRTUAL_ENV", venv);
        set_var("PATH", &format!("{venv_bin}:{path}"));
    }
    Ok(())
}
