// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::pathlib::PathLib;
use crate::wit::metatype::typegraph::host::{
    expand_path as expand_path_host, path_exists as path_exists_host, read_file as read_file_host,
    write_file as write_file_host,
};
use crate::{errors::Result, wit::core::Error as TgError};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeSet,
    path::{Path, PathBuf},
};

#[derive(Clone, Debug)]
pub struct FsContext {
    pathlib: PathLib,
}

impl FsContext {
    pub fn new(base_dir: PathBuf) -> Self {
        Self {
            pathlib: PathLib::new(base_dir),
        }
    }

    pub fn exists(&self, path: &Path) -> Result<bool> {
        Ok(path_exists_host(
            &self.pathlib.get_base_dir().join(path).to_string_lossy(),
        )?)
    }

    pub fn expand_path(&self, path: &Path, exclude_globs: &[String]) -> Result<Vec<PathBuf>> {
        let exclude_as_regex = exclude_globs
            .iter()
            .map(|glob_pattern| {
                let mut regex_pattern = String::new();
                for c in glob_pattern.chars() {
                    match c {
                        '*' => regex_pattern.push_str(".*"),
                        '?' => regex_pattern.push('.'),
                        _ => {
                            if ".()+-[]^$|".contains(c) {
                                // escape native regex
                                regex_pattern.push('\\');
                            }
                            regex_pattern.push(c);
                        }
                    }
                }
                // test as suffix if glob star is present
                if glob_pattern.contains('*') {
                    regex_pattern.push('$');
                }
                regex_pattern
            })
            .collect::<Vec<_>>();

        expand_path_host(
            &self.pathlib.get_base_dir().join(path).to_string_lossy(),
            &exclude_as_regex,
        )?
        .iter()
        .map(|p| self.pathlib.relative(Path::new(p)))
        .collect::<Result<Vec<_>, _>>()
    }

    fn extract_glob_dirname(path: &str) -> PathBuf {
        let path = PathBuf::from(path);
        let dirs: Vec<_> = path.components().map(|comp| comp.as_os_str()).collect();
        let mut parent_dir = PathBuf::new();
        let special_chars = &['*', '?', '[', ']'];

        for dir in dirs {
            let dir = dir.to_str().unwrap();
            if dir.find(special_chars).is_some() {
                break;
            }
            parent_dir = parent_dir.join(dir);
        }

        parent_dir
    }

    pub fn expand_glob(&self, path: &Path) -> Result<Vec<PathBuf>> {
        let path_str = path.to_string_lossy();
        let parent_dir = Self::extract_glob_dirname(&path_str);
        let all_files = self.expand_path(&parent_dir, &[])?;

        let glob_pattern = glob::Pattern::new(&path_str).unwrap();

        Ok(all_files
            .into_iter()
            .filter(|p| glob_pattern.matches(&p.to_string_lossy()))
            .collect::<Vec<_>>())
    }

    fn is_glob(path: &str) -> bool {
        // dir can also contain wild cards,
        path.contains('*') || path.contains('?')
    }

    pub fn list_files(&self, glob_or_dirs: &[String]) -> Vec<PathBuf> {
        glob_or_dirs
            .iter()
            .flat_map(|dep| {
                if Self::is_glob(dep) {
                    self.expand_glob(Path::new(dep)).into_iter().flatten()
                } else {
                    self.expand_path(Path::new(dep), &[]).into_iter().flatten()
                }
            })
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect()
    }

    pub fn read_file(&self, path: &Path) -> Result<Vec<u8>> {
        Ok(read_file_host(
            &self.pathlib.get_base_dir().join(path).to_string_lossy(),
        )?)
    }

    pub fn read_text_file(&self, path: &Path) -> Result<String> {
        self.read_file(path)
            .and_then(|bytes| String::from_utf8(bytes).map_err(TgError::from_std))
    }

    pub fn write_file(&self, path: &Path, bytes: &[u8]) -> Result<()> {
        Ok(write_file_host(
            &self.pathlib.get_base_dir().join(path).to_string_lossy(),
            bytes,
        )?)
    }

    pub fn write_text_file(&self, path: &Path, text: String) -> Result<()> {
        self.write_file(path, text.as_bytes())
    }

    // TODO limited buffer?
    pub fn hash_file(&self, path: &Path) -> Result<(String, u32)> {
        let mut sha256 = Sha256::new();
        let bytes = self.read_file(path)?;
        let size = bytes.len() as u32;
        sha256.update(bytes);
        Ok((format!("{:x}", sha256.finalize()), size))
    }
}
