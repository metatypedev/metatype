// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    config::{Config, ModuleType},
    fs::is_hidden,
};
use anyhow::Result;
use globset::GlobSet;
use grep::searcher::sinks::UTF8;
use grep::searcher::{BinaryDetection, SearcherBuilder};
use grep::{regex::RegexMatcher, searcher::Searcher};
use ignore::{gitignore::Gitignore, Match, WalkBuilder};
use log::{debug, info};
use pathdiff::diff_paths;
use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
    sync::Arc,
};

pub struct Discovery {
    dir: PathBuf,
    filter: FileFilter,
    #[allow(dead_code)]
    follow_symlinks: bool,
}

impl Discovery {
    pub fn new(config: Arc<Config>, dir: PathBuf) -> Self {
        let filter = FileFilter::new(&config).expect("Could not load filters");
        Self {
            dir,
            filter,
            follow_symlinks: true,
        }
    }

    pub async fn get_all(self) -> Result<Vec<PathBuf>> {
        let mut res = HashSet::new();
        let mut searcher = SearcherBuilder::new()
            .binary_detection(BinaryDetection::none())
            .build();

        for result in WalkBuilder::new(self.dir.clone())
            .standard_filters(true)
            .follow_links(true)
            .build()
        {
            let entry = match result {
                Ok(entry) => entry,
                Err(err) => {
                    debug!("{}", err);
                    continue;
                }
            };
            let path = entry.path();
            if self.filter.is_excluded(path, &mut searcher) {
                continue;
            }

            let rel_path = diff_paths(path, &self.dir).unwrap();
            info!(
                "Found typegraph definition module at {}",
                rel_path.display()
            );
            res.insert(path.to_path_buf());
        }

        Ok(res.into_iter().collect())
    }
}

pub struct GlobFilter {
    include_set: GlobSet,
    exclude_set: GlobSet,
}

pub struct FileFilter {
    base_dir: PathBuf,
    globs: HashMap<ModuleType, GlobFilter>,
    gitignore: Option<Gitignore>,
    exclude_hidden: bool,
    matcher: RegexMatcher,
}

impl FileFilter {
    pub fn new(config: &Config) -> Result<Self> {
        let mut globs = HashMap::new();
        let python_loader_config = config.loader(ModuleType::Python);
        globs.insert(
            ModuleType::Python,
            GlobFilter {
                include_set: python_loader_config.get_include_set()?,
                exclude_set: python_loader_config.get_exclude_set()?,
            },
        );
        let ignore = config.base_dir.join(".gitignore");
        let gitignore = if ignore.exists() {
            Some(Gitignore::new(ignore).0)
        } else {
            None
        };
        let matcher = RegexMatcher::new_line_matcher("with\\s+TypeGraph")?;

        Ok(Self {
            base_dir: config.base_dir.clone(),
            globs,
            gitignore,
            exclude_hidden: true,
            matcher,
        })
    }

    pub fn is_excluded(&self, path: &Path, searcher: &mut Searcher) -> bool {
        if path.is_dir() {
            return true;
        }

        let rel_path = diff_paths(path, &self.base_dir).unwrap();
        if rel_path.as_os_str().is_empty() {
            return true;
        }

        if let Some(gi) = &self.gitignore {
            if matches!(gi.matched(&rel_path, false), Match::Ignore(_)) {
                return true;
            }
        }

        if self.exclude_hidden && is_hidden(&rel_path) {
            return true;
        }

        let globs = self.globs.get(&ModuleType::Python).unwrap();

        if !globs.include_set.is_empty() && !globs.include_set.is_match(&rel_path) {
            return true;
        }

        if !globs.exclude_set.is_empty() && globs.exclude_set.is_match(&rel_path) {
            return true;
        }

        let mut ret = true;
        searcher
            .search_path(
                &self.matcher,
                path,
                UTF8(|_, _| {
                    ret = false;
                    Ok(true)
                }),
            )
            .unwrap();

        ret
    }
}
