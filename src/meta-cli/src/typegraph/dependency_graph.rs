// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
};

use typegraph_core::sdk::core::Artifact;

#[derive(Default)]
pub struct DependencyGraph {
    deps: HashMap<PathBuf, HashSet<PathBuf>>, // typegraph -> deno modules
    reverse_deps: HashMap<PathBuf, HashSet<PathBuf>>, // deno module -> typegraphs
}

impl DependencyGraph {
    pub fn update_typegraph(&mut self, path: PathBuf, artifacts: &[Artifact]) {
        let parent_dir = path.parent().unwrap();
        let artifact_paths = artifacts
            .iter()
            .flat_map(|a| parent_dir.join(&a.path).canonicalize());
        let deps = self.deps.entry(path.clone()).or_default();
        let old_deps = std::mem::replace(deps, artifact_paths.collect());
        let removed_deps = old_deps.difference(deps);
        let added_deps = deps.difference(&old_deps);

        for removed in removed_deps {
            let rdeps = self.reverse_deps.get_mut(removed).unwrap();
            rdeps.take(&path).unwrap();
            if rdeps.is_empty() {
                self.reverse_deps.remove(removed);
            }
        }

        for added in added_deps {
            if let Some(set) = self.reverse_deps.get_mut(added) {
                set.insert(path.clone());
            } else {
                self.reverse_deps
                    .insert(added.clone(), HashSet::from_iter(Some(path.clone())));
            }
        }
    }

    pub fn remove_typegraph_at(&mut self, path: &Path) {
        let deps = self.deps.remove(path);
        if let Some(deps) = deps {
            for dep in deps.iter() {
                let rdeps = self.reverse_deps.get_mut(dep).unwrap();
                rdeps.take(path).unwrap();
                if rdeps.is_empty() {
                    self.reverse_deps.remove(dep);
                }
            }
        }
    }

    /// Get paths of reverse dependencies (dependent typegraphs)
    pub fn get_rdeps(&self, path: &Path) -> Vec<PathBuf> {
        self.reverse_deps
            .get(path)
            .map(|deps| deps.iter().cloned())
            .into_iter()
            .flatten()
            .collect()
    }
}
