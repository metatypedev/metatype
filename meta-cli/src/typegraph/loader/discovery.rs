// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use crate::interlude::*;

use crate::{
    config::{Config, ModuleType, TypegraphLoaderConfig},
    fs::is_hidden,
};
use globset::GlobSet;
use ignore::{gitignore::Gitignore, Match, WalkBuilder};
use pathdiff::diff_paths;
use std::collections::HashSet;

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

    pub async fn start(self, mut handler: impl FnMut(Result<PathBuf>)) -> Result<()> {
        for result in WalkBuilder::new(self.dir.clone())
            .standard_filters(true)
            .follow_links(true)
            .build()
        {
            match result {
                Ok(entry) => {
                    let path = entry.path();
                    if !self.filter.is_excluded(path) {
                        handler(Ok(path.to_path_buf()));
                    } else {
                        trace!("excluded from discovery {path:?}");
                    }
                }
                Err(err) => {
                    handler(Err(err.into()));
                }
            }
        }

        Ok(())
    }

    pub async fn get_all(self, silent: bool) -> Result<Vec<PathBuf>> {
        let mut res = HashSet::new();

        let dir = self.dir.clone();
        self.start(|path| match path {
            Ok(path) => {
                let rel_path = diff_paths(path.as_path(), &dir).unwrap();
                if !silent && res.insert(path) {
                    debug!(
                        "Found typegraph definition module at {}",
                        rel_path.display()
                    );
                }
            }
            Err(err) => debug!("{}", err),
        })
        .await?;

        Ok(res.into_iter().collect())
    }
}

impl TryFrom<&Path> for ModuleType {
    type Error = eyre::Error;

    fn try_from(path: &Path) -> std::result::Result<Self, Self::Error> {
        match path.extension() {
            Some(ext) if ext == "ts" || ext == "mts" => Ok(ModuleType::TypeScript),
            Some(ext) if ext == "js" || ext == "mjs" || ext == "cjs" => Ok(ModuleType::JavaScript),
            Some(ext) if ext == "py" => Ok(ModuleType::Python),
            _ => Err(ferr!(
                "unable to determine module type from path extension: {path:?}"
            )),
        }
    }
}

pub struct GlobFilter {
    include_set: GlobSet,
    exclude_set: GlobSet,
}

struct SpecificFilters {
    globs: GlobFilter,
}

pub struct FileFilter {
    base_dir: PathBuf,
    gitignore: Option<Gitignore>,
    exclude_hidden: bool,
    python_filter: GlobFilter,
    typescript_filter: GlobFilter,
    javascript_filter: GlobFilter,
}

impl FileFilter {
    fn get_glob_filter(config: &TypegraphLoaderConfig) -> Result<GlobFilter> {
        Ok(GlobFilter {
            include_set: config.get_include_set()?,
            exclude_set: config.get_exclude_set()?,
        })
    }
    pub fn new(config: &Config) -> Result<Self> {
        let ignore = config.base_dir.join(".gitignore");
        let gitignore = if ignore.exists() {
            Some(Gitignore::new(ignore).0)
        } else {
            None
        };

        Ok(Self {
            base_dir: config.base_dir.clone(),
            gitignore,
            exclude_hidden: true,
            python_filter: Self::get_glob_filter(config.loader(ModuleType::Python))?,
            typescript_filter: Self::get_glob_filter(config.loader(ModuleType::TypeScript))?,
            javascript_filter: Self::get_glob_filter(config.loader(ModuleType::JavaScript))?,
        })
    }

    pub fn is_excluded(&self, path: &Path) -> bool {
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

        match ModuleType::try_from(path) {
            Ok(ModuleType::Python) => self.is_excluded_by_filter(&rel_path, &self.python_filter),
            Ok(ModuleType::TypeScript) => {
                self.is_excluded_by_filter(&rel_path, &self.typescript_filter)
            }
            Ok(ModuleType::JavaScript) => {
                self.is_excluded_by_filter(&rel_path, &self.javascript_filter)
            }
            Err(_) => true,
        }
    }

    fn is_excluded_by_filter(&self, rel_path: &Path, filter: &GlobFilter) -> bool {
        if !filter.include_set.is_empty() && !filter.include_set.is_match(rel_path) {
            return true;
        }

        if !filter.exclude_set.is_empty() && filter.exclude_set.is_match(rel_path) {
            return true;
        }

        false
    }
}
