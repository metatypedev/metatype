// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use crate::{
    config::{Config, ModuleType},
    fs::is_hidden,
};
use anyhow::Result;
use globset::GlobSet;
use ignore::{gitignore::Gitignore, Match};
use log::info;
use pathdiff::diff_paths;
use std::{
    collections::{HashMap, VecDeque},
    path::{Path, PathBuf},
    sync::Arc,
};
use tokio::fs;

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

    #[allow(dead_code)]
    pub fn exclude_gitignored(mut self, exclude: bool) -> Self {
        self.filter.exclude_gitignored(exclude);
        self
    }

    #[allow(dead_code)]
    pub fn exclude_hidden_files(mut self, exclude: bool) -> Self {
        self.filter.exclude_hidden(exclude);
        self
    }

    #[allow(dead_code)]
    pub fn follow_symlinks(mut self, follow: bool) -> Self {
        self.follow_symlinks = follow;
        self
    }

    pub async fn get_all(self) -> Result<Vec<PathBuf>> {
        let mut res = vec![];
        let mut queue: VecDeque<PathBuf> = VecDeque::new();
        queue.push_back(self.dir.clone());

        while let Some(dir) = queue.pop_front() {
            let mut read_dir = fs::read_dir(&dir).await?;
            while let Some(entry) = read_dir.next_entry().await? {
                let mut file_name = dir.join(entry.file_name());
                let mut file_type = entry.file_type().await?;

                while file_type.is_symlink() {
                    file_name = fs::read_link(file_name).await?;
                    file_name = dir.join(file_name); // ?
                    file_type = fs::metadata(&file_name).await?.file_type();
                }

                let file_name = file_name;
                let file_type = file_type;

                if file_type.is_dir() {
                    queue.push_back(file_name);
                } else if !self.filter.is_excluded(&file_name) {
                    let rel_path = diff_paths(&file_name, &self.dir).unwrap();
                    info!("Found typegraph definition module at {rel_path:?}");
                    res.push(file_name);
                }
            }
        }

        Ok(res)
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
        Ok(Self {
            base_dir: config.base_dir.clone(),
            globs,
            gitignore: None,
            exclude_hidden: false,
        })
    }

    pub fn exclude_hidden(&mut self, exclude: bool) {
        self.exclude_hidden = exclude;
    }

    pub fn exclude_gitignored(&mut self, exclude: bool) {
        if exclude {
            if self.gitignore.is_none() {
                self.gitignore = Some(Gitignore::new(self.base_dir.join(".gitignore")).0);
            }
        } else {
            self.gitignore = None;
        }
    }

    pub fn is_excluded(&self, path: &Path) -> bool {
        match &self.gitignore {
            Some(gi) => {
                if matches!(gi.matched(path, false), Match::Ignore(_)) {
                    return true;
                }
            }
            None => {}
        }

        if self.exclude_hidden && is_hidden(path) {
            return true;
        }

        let rel_path = diff_paths(path, &self.base_dir).unwrap();

        match path.extension() {
            Some(ext) if ext == "py" => {
                let globs = self.globs.get(&ModuleType::Python).unwrap();
                if !globs.include_set.is_empty() && !globs.include_set.is_match(&rel_path) {
                    return true;
                }

                if !globs.exclude_set.is_empty() && globs.exclude_set.is_match(&rel_path) {
                    return true;
                }

                // TODO regex check file content

                false
            }
            _ => {
                // trace!("File excluded: unknown extension: {path:?}");
                true
            }
        }
    }
}
