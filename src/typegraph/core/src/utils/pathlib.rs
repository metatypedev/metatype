// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};

pub struct PathLib {
    base_dir: PathBuf,
}

impl PathLib {
    pub fn new(base_dir: PathBuf) -> Self {
        Self { base_dir }
    }

    pub fn get_base_dir(&self) -> &PathBuf {
        &self.base_dir
    }

    pub fn relative(&self, path: &Path) -> Result<PathBuf, String> {
        path.strip_prefix(&self.base_dir)
            .map_err(|e| e.to_string())
            .map(|r| r.to_path_buf())
    }
}
