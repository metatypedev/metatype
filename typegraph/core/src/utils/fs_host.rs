// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};

use common::archive::{archive_entries_from_bytes, encode_bytes_to_base_64};
use indexmap::IndexMap;

use crate::wit::metatype::typegraph::host::{expand_glob, get_cwd, read_file, write_file};

pub fn read_text_file<P: Into<String>>(path: P) -> Result<String, String> {
    read_file(&path.into()).and_then(|bytes| {
        let s = std::str::from_utf8(&bytes).map_err(|e| e.to_string())?;
        Ok(s.to_owned())
    })
}

#[allow(unused)]
pub fn write_text_file<P: Into<String>, S: Into<String>>(path: P, text: S) -> Result<(), String> {
    write_file(&path.into(), text.into().as_bytes())
}

pub fn compress<P: Into<String>>(path: P, exclude: Option<Vec<String>>) -> Result<Vec<u8>, String> {
    // Note: each exclude entry is a regex pattern
    let exclude = exclude.unwrap_or_default();
    let paths = expand_glob(&path.into(), &exclude)?;
    let mut entries = IndexMap::new();
    for path in paths {
        entries.insert(path.clone(), read_file(&path.clone())?);
    }
    archive_entries_from_bytes(entries).map_err(|e| e.to_string())
}

pub fn compress_and_encode_base64<P: Into<String>>(path: P) -> Result<String, String> {
    let exclude = vec!["node_modules/".to_string(), "\\.git/".to_string()];
    let bytes = compress(path, Some(exclude))?;
    encode_bytes_to_base_64(bytes).map_err(|e| e.to_string())
}

pub fn cwd() -> Result<PathBuf, String> {
    // idea: make it configurable from the frontends?
    let ret = PathBuf::from(get_cwd()?.to_owned());
    Ok(ret)
}

pub fn make_relative(path: &Path) -> Result<PathBuf, String> {
    path.strip_prefix(cwd()?)
        .map_err(|e| e.to_string())
        .map(|r| r.to_owned())
}

pub fn make_absolute(path: &Path) -> Result<PathBuf, String> {
    match path.is_relative() {
        true => Ok(cwd()?.join(path)),
        false => Ok(path.to_owned()),
    }
}
