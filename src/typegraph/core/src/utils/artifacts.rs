// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::PathBuf;

use super::fs::FsContext;
use crate::errors::{ErrorContext as _, Result};
use tg_schema::{runtimes::Artifact, Typegraph};

pub trait ArtifactsExt {
    /// update the artifact meta, and register the artifact in the typegraph
    fn register_artifacts(
        &self,
        tg: &mut Typegraph,
        entry: PathBuf,
        deps: Vec<PathBuf>,
    ) -> Result<Vec<PathBuf>>;
}

impl ArtifactsExt for FsContext {
    fn register_artifacts(
        &self,
        tg: &mut Typegraph,
        entry: PathBuf,
        deps: Vec<PathBuf>,
    ) -> Result<Vec<PathBuf>> {
        let mut registered_deps = vec![];
        self.register_artifact(tg, entry)?;
        for dep in deps {
            let artifacts = self.list_files(&[dep.to_string_lossy().to_string()]);
            if artifacts.is_empty() {
                return Err(format!(
                    "no artifacts found for dependency '{}'",
                    dep.to_string_lossy()
                )
                .into());
            }
            for artifact in artifacts.into_iter() {
                self.register_artifact(tg, artifact.clone())?;
                registered_deps.push(artifact);
            }
        }

        Ok(registered_deps)
    }
}

impl FsContext {
    fn register_artifact(&self, tg: &mut Typegraph, path: PathBuf) -> Result<()> {
        use std::collections::btree_map::Entry;
        if let Entry::Vacant(entry) = tg.meta.artifacts.entry(path) {
            let path = entry.key().to_path_buf();
            let (hash, size) = self
                .hash_file(&path)
                .with_context(|| format!("failed to hash artifact at {path:?}"))?;
            tg.deps.push(path.clone());
            entry.insert(Artifact { hash, size, path });
        }

        Ok(())
    }
}
