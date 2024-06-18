// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;
use tokio::process::Command;

enum TsRuntime {
    Deno,
    Node,
    Bun,
}

// TODO no `x tsx` for .js or .mjs files
pub(super) async fn get_raw_command(path: impl AsRef<Path>) -> Result<Command> {
    let path = path.as_ref();
    match detect_runtime(path).await? {
        TsRuntime::Deno => {
            log::debug!("loading typegraph using deno");
            let mut command = Command::new("deno");
            command
                .arg("run")
                // .arg("--unstable")
                .arg("--allow-all")
                .arg("--check")
                .arg(path.to_str().unwrap());
            Ok(command)
        }
        TsRuntime::Node => {
            log::debug!(
                "loading typegraph using npm x tsx, make sure npm packages have been installed"
            );
            let mut command = Command::new("npm");
            command
                .arg("x")
                .arg("--yes")
                .arg("tsx")
                .arg(path.to_str().unwrap());
            Ok(command)
        }
        TsRuntime::Bun => {
            log::debug!(
                "loading typegraph using bun x tsx, make sure npm packages have been installed"
            );
            let mut command = Command::new("bun");
            command
                .arg("x")
                .arg("tsx")
                .arg(path.to_str().unwrap())
                .current_dir(path.parent().unwrap());
            Ok(command)
        }
    }
}

// TODO cache?
async fn detect_runtime(tg_path: &Path) -> Result<TsRuntime> {
    use utils::*;
    use TsRuntime::*;

    let mut maybe_parent_dir = tg_path.parent();
    // try to detect runtime in use by checking for package.json/deno.json
    // files first
    loop {
        let Some(parent_dir) = maybe_parent_dir else {
            break;
        };
        log::trace!("testing for ts project manifest in {parent_dir:?}");
        if has_deno_json(parent_dir).await {
            log::trace!("deno.json hit in {parent_dir:?}");
            return Ok(Deno);
        }
        if has_package_json(parent_dir).await {
            log::trace!("package.json hit in {parent_dir:?}");
            if test_node_exec().await? {
                return Ok(Node);
            }
            if test_bun_exec().await? {
                return Ok(Bun);
            }
        }
        maybe_parent_dir = parent_dir.parent();
    }

    // if no package manifest found, just use the first runtime found in the
    // following order
    if test_deno_exec().await? {
        return Ok(Deno);
    }
    if test_node_exec().await? {
        return Ok(Node);
    }
    if test_bun_exec().await? {
        return Ok(Bun);
    }
    Err(ferr!("unable to find deno, node or bun runtimes"))
}

mod utils {
    use super::*;
    use cached::proc_macro::cached;

    #[cached(result = true)]
    pub async fn test_deno_exec() -> Result<bool> {
        Ok(Command::new("deno")
            .arg("--version")
            .output()
            .await
            .map(|out| out.status.success())?)
    }

    #[cached(result = true)]
    pub async fn test_node_exec() -> Result<bool> {
        Ok(Command::new("node")
            .arg("-v")
            .output()
            .await
            .map(|out| out.status.success())?)
    }

    #[cached(result = true)]
    pub async fn test_bun_exec() -> Result<bool> {
        Ok(Command::new("bun")
            .arg("-v")
            .output()
            .await
            .map(|out| out.status.success())?)
    }

    #[inline]
    pub async fn has_deno_json(dir: &Path) -> bool {
        use tokio::fs::try_exists;
        matches!(try_exists(dir.join("deno.json")).await, Ok(true))
            || matches!(try_exists(dir.join("deno.jsonc")).await, Ok(true))
    }

    #[inline]
    pub async fn has_package_json(dir: &Path) -> bool {
        use tokio::fs::try_exists;
        matches!(try_exists(dir.join("package.json")).await, Ok(true))
    }
}
