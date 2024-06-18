// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::PathBuf;

use super::fs::FsContext;
use common::typegraph::{runtimes::Artifact, Typegraph};

pub trait ArtifactsExt {
    /// update the artifact meta, and register the artifact in the typegraph
    fn register_artifact(&self, artifact_path: PathBuf, tg: &mut Typegraph) -> Result<(), String>;
}

impl ArtifactsExt for FsContext {
    fn register_artifact(&self, path: PathBuf, tg: &mut Typegraph) -> Result<(), String> {
        use std::collections::btree_map::Entry;
        if let Entry::Vacant(entry) = tg.meta.artifacts.entry(path) {
            let path = entry.key().to_path_buf();
            let (hash, size) = self.hash_file(&path)?;
            tg.deps.push(path.clone());
            entry.insert(Artifact { hash, size, path });
        }

        Ok(())
    }
}
