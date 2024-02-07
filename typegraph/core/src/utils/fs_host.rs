// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};

use common::archive::{
    archive_entries_from_bytes, encode_bytes_to_base_64, tarb64_unpack_entries_as_map,
};
use indexmap::IndexMap;

use crate::{
    global_store::Store,
    wit::metatype::typegraph::host::{expand_glob, get_cwd, read_file, write_file},
};

pub fn read_text_file<P: Into<String>>(path: P) -> Result<String, String> {
    read_file(&path.into()).and_then(|bytes| {
        let s = std::str::from_utf8(&bytes).map_err(|e| e.to_string())?;
        Ok(s.to_owned())
    })
}

#[allow(unused)]
pub fn write_text_file<P: Into<String>>(path: P, text: P) -> Result<(), String> {
    write_file(&path.into(), text.into().as_bytes())
}

pub fn compress<P: Into<String>>(path: P, exclude: Option<Vec<String>>) -> Result<Vec<u8>, String> {
    // Note: each exclude entry is a regex pattern
    let exclude = exclude.unwrap_or_default();
    let paths = expand_glob(&path.into(), &exclude)?;
    let mut entries = IndexMap::new();
    let cwd = get_cwd()?;
    for path_str in paths.iter() {
        let path = PathBuf::from(path_str)
            .strip_prefix(cwd.clone()) // path in archives must be relative!
            .unwrap_or(&PathBuf::from(path_str))
            .display()
            .to_string();
        entries.insert(path.clone(), read_file(&path.clone())?);
    }
    archive_entries_from_bytes(entries).map_err(|e| e.to_string())
}

pub fn unpack_base64<P: Into<String>>(tarb64: &str, dest: P) -> Result<(), String> {
    let dest = PathBuf::from(dest.into());
    let contents = tarb64_unpack_entries_as_map(Some(tarb64)).map_err(|e| e.to_string())?;

    for (path, bytes) in contents {
        let dest_file = dest.join(path).display().to_string();
        write_file(&dest_file, &bytes)?;
    }

    Ok(())
}

pub fn compress_and_encode_base64(path: PathBuf) -> Result<String, String> {
    let exclude = vec!["node_modules/".to_string(), "\\.git/".to_string()];
    let bytes = compress(path.display().to_string(), Some(exclude))?;
    encode_bytes_to_base_64(bytes).map_err(|e| e.to_string())
}

/// Returns `get_cwd()` by default, custom `dir` otherwise
pub fn cwd() -> Result<PathBuf, String> {
    match Store::get_deploy_cwd() {
        Some(path) => Ok(path),
        None => Ok(PathBuf::from(get_cwd()?.to_owned())),
    }
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
