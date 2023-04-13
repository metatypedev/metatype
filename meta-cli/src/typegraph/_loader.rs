// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

pub mod discovery;
pub mod queue;

pub use discovery::Discovery;

use futures::{future::BoxFuture, FutureExt};
use std::{
    collections::{HashMap, HashSet, VecDeque},
    env,
    future::Future,
    path::{Path, PathBuf},
    process::Stdio,
    sync::{Arc, Mutex},
    time::Duration,
};

use anyhow::{bail, Context, Error, Result};
use colored::Colorize;
use common::typegraph::Typegraph;
use ignore::{gitignore::Gitignore, Match};
use log::{info, warn};
use notify_debouncer_mini::{
    new_debouncer,
    notify::{self, RecommendedWatcher, RecursiveMode},
    DebounceEventResult, Debouncer,
};
use pathdiff::diff_paths;
use tokio::{
    process::Command,
    sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender},
};

use crate::{
    config::Config,
    utils::{ensure_venv, fs::is_hidden},
};

use super::postprocess::{self, apply_all, PostProcessorWrapper};

// TODO use Rc<PathBuf>
#[derive(Default)]
struct DependencyGraph {
    deps: HashMap<PathBuf, HashSet<PathBuf>>, // typegraph -> deno modules
    reverse_deps: HashMap<PathBuf, HashSet<PathBuf>>, // deno module -> typegraphs
}

impl DependencyGraph {
    /// return the list of removed dependencies and added dependencies
    fn update_typegraph(&mut self, tg: &Typegraph) {
        let path = tg.path.clone().unwrap();
        if !self.deps.contains_key(&path) {
            self.deps.insert(path.clone(), HashSet::default());
        }

        let deps = self.deps.get_mut(&path).unwrap();
        let old_deps = std::mem::replace(deps, tg.deps.iter().cloned().collect());
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

    fn remove_typegraph_at(&mut self, path: &Path) {
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
}
