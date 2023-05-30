// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{bail, Result};
use pathdiff::diff_paths;
use std::path::{Path, PathBuf};

pub fn is_hidden(path: impl AsRef<Path>) -> bool {
    path.as_ref().components().any(|c| {
        c.as_os_str()
            .to_str()
            .map(|s| s.starts_with('.'))
            .unwrap_or(false)
    })
}

pub fn find_in_parents<P: AsRef<Path>>(start_dir: P, files: &[&str]) -> Result<Option<PathBuf>> {
    let mut current_dir = start_dir.as_ref().to_path_buf();
    if !current_dir.is_dir() {
        current_dir.pop();
    }
    loop {
        for file in files.iter() {
            let path = current_dir.join(file);
            if path.try_exists()? {
                return Ok(Some(path));
            }
        }
        if !current_dir.pop() {
            return Ok(None);
        }
    }
}

pub fn clean_path<P: AsRef<Path>, B: AsRef<Path>>(base_dir: B, path: P) -> Result<String> {
    let base_dir = base_dir.as_ref();
    let path = path.as_ref();
    let path = match diff_paths(path, base_dir) {
        Some(rel) => rel,
        None => {
            if base_dir.join(path).try_exists()? {
                path.to_path_buf()
            } else {
                bail!(
                    "Path {} is not in the base directory {} or does not exist",
                    path.display(),
                    base_dir.display()
                )
            }
        }
    };
    Ok(path.display().to_string())
}
