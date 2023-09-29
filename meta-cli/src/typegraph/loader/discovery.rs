// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    config::{Config, ModuleType, TypegraphLoaderConfig},
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
    collections::HashSet,
    path::{Path, PathBuf},
    sync::Arc,
};

pub struct Discovery {
    dir: PathBuf,
    filter: FileFilter,
    #[allow(dead_code)]
    follow_symlinks: bool,
    silence: bool,
}

impl Discovery {
    pub fn new(config: Arc<Config>, dir: PathBuf, silence: bool) -> Self {
        let filter = FileFilter::new(&config).expect("Could not load filters");
        Self {
            dir,
            filter,
            follow_symlinks: true,
            silence,
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
            if !self.silence {
                info!(
                    "Found typegraph definition module at {}",
                    rel_path.display()
                );
            }
            res.insert(path.to_path_buf());
        }

        Ok(res.into_iter().collect())
    }
}

impl TryFrom<&Path> for ModuleType {
    type Error = ();

    fn try_from(path: &Path) -> std::result::Result<Self, Self::Error> {
        match path.extension() {
            Some(ext) if ext == "ts" => Ok(ModuleType::Deno),
            Some(ext) if ext == "py" => Ok(ModuleType::Python),
            _ => Err(()),
        }
    }
}

pub struct GlobFilter {
    include_set: GlobSet,
    exclude_set: GlobSet,
}

struct SpecificFilters {
    matcher: RegexMatcher,
    globs: GlobFilter,
}

pub struct FileFilter {
    base_dir: PathBuf,
    gitignore: Option<Gitignore>,
    exclude_hidden: bool,
    python: SpecificFilters,
    deno: SpecificFilters,
}

impl FileFilter {
    fn python_filters(config: &TypegraphLoaderConfig) -> Result<SpecificFilters> {
        // soon
        // let matcher = RegexMatcher::new_line_matcher("@typegraph\\(.*?\\)");
        let matcher = RegexMatcher::new_line_matcher("with\\s+[Tt]ype[Gg]raph|@typegraph\\(")?;

        Ok(SpecificFilters {
            matcher,
            globs: GlobFilter {
                include_set: config.get_include_set()?,
                exclude_set: config.get_exclude_set()?,
            },
        })
    }

    fn deno_filters(config: &TypegraphLoaderConfig) -> Result<SpecificFilters> {
        Ok(SpecificFilters {
            matcher: RegexMatcher::new_line_matcher("^typegraph\\(")?,
            globs: GlobFilter {
                include_set: config.get_include_set()?,
                exclude_set: config.get_exclude_set()?,
            },
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
            python: Self::python_filters(config.loader(ModuleType::Python))?,
            deno: Self::deno_filters(config.loader(ModuleType::Deno))?,
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

        match ModuleType::try_from(path) {
            Ok(ModuleType::Python) => self.is_python_module_excluded(path, &rel_path, searcher),

            Ok(ModuleType::Deno) => self.is_deno_module_excluded(path, &rel_path, searcher),
            Err(_) => true,
        }
    }

    fn is_python_module_excluded(
        &self,
        path: &Path,
        rel_path: &Path,
        searcher: &mut Searcher,
    ) -> bool {
        let globs = &self.python.globs;

        if !globs.include_set.is_empty() && !globs.include_set.is_match(rel_path) {
            return true;
        }

        if !globs.exclude_set.is_empty() && globs.exclude_set.is_match(rel_path) {
            return true;
        }

        let mut ret = true;
        searcher
            .search_path(
                &self.python.matcher,
                path,
                UTF8(|_, _| {
                    ret = false;
                    Ok(true)
                }),
            )
            .unwrap();

        ret
    }

    fn is_deno_module_excluded(
        &self,
        path: &Path,
        rel_path: &Path,
        searcher: &mut Searcher,
    ) -> bool {
        let globs = &self.deno.globs;

        if !globs.include_set.is_empty() && !globs.include_set.is_match(rel_path) {
            return true;
        }

        if !globs.exclude_set.is_empty() && globs.exclude_set.is_match(rel_path) {
            return true;
        }

        let mut ret = true;

        searcher
            .search_path(
                &self.deno.matcher,
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
