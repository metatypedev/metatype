use anyhow::{anyhow, Result};
use std::path::Path;

pub fn ensure_venv<P: AsRef<Path>>(dir: P) -> Result<()> {
    use std::env::{set_var, var};
    if var("VIRTUAL_ENV").is_ok() {
        return Ok(());
    }

    let venv_dir = dir.as_ref().join(".venv");

    if venv_dir.is_dir() {
        let venv = venv_dir.to_str().unwrap();
        let venv_bin = venv_dir.join("bin");
        let venv_bin = venv_bin.to_str().unwrap();
        let path = var("PATH")?;
        set_var("VIRTUAL_ENV", venv);
        set_var("PATH", &format!("{venv_bin}:{path}"));
        Ok(())
    } else {
        Err(anyhow!("Python venv required"))
    }
}
