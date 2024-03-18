// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};

use common::archive::{
    archive_entries_from_bytes, encode_bytes_to_base_64, tarb64_unpack_entries_as_map,
};
use indexmap::IndexMap;

use crate::{
    global_store::Store,
    wit::metatype::typegraph::host::{expand_glob, get_cwd, path_exists, read_file, write_file},
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

pub fn common_prefix_paths(paths: &[PathBuf]) -> Option<PathBuf> {
    if paths.is_empty() {
        return None;
    }

    // always >= 1
    let mut prefix = paths[0].clone();
    for path in paths.iter().skip(1) {
        prefix = prefix
            .components()
            .zip(path.components())
            .take_while(|&(a, b)| a == b)
            .map(|(a, _)| a)
            .collect::<_>();
    }

    // [/]a/b => if path is absolute, path_chunk[0] is an empty string
    if prefix.components().count() == 0 {
        return None;
    }

    Some(prefix)
}

pub fn relativize_paths(paths: &[PathBuf]) -> Result<Vec<PathBuf>, String> {
    if paths.is_empty() {
        return Ok(vec![]);
    }

    if let Some(common_dir) = common_prefix_paths(paths) {
        let ret = paths
            .iter()
            .map(|path| {
                path.strip_prefix(common_dir.clone())
                    .map_err(|e| e.to_string())
                    .map(|v| v.to_path_buf())
            })
            .collect::<Result<Vec<_>, String>>()?;
        return Ok(ret);
    }

    Err("Cannot relativize path list if one item is already relative".to_string())
}

pub fn compress<P: Into<String>>(path: P, exclude: Option<Vec<String>>) -> Result<Vec<u8>, String> {
    // Note: each exclude entry is a regex pattern
    let exclude = exclude.unwrap_or_default();
    let paths = expand_glob(&path.into(), &exclude)?;
    let mut entries = IndexMap::new();
    // eprint("Preparing tarball");

    let abs_paths = paths.iter().map(PathBuf::from).collect::<Vec<PathBuf>>();
    let rel_paths = relativize_paths(&abs_paths)?;

    for (i, abs_path) in abs_paths.iter().enumerate() {
        let rel_path_str = rel_paths[i].to_string_lossy();
        // eprint(&format!(" ++ {}", rel_path_str.clone()));
        // Note: tarball path should be relative
        // Note: Strip against workdir does not work when the sdk is spawn from another process
        entries.insert(rel_path_str.into(), read_file(&abs_path.to_string_lossy())?);
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
    let mut sdkignore = load_sdk_ignore_file()?;
    let default = vec!["node_modules/".to_string(), "\\.git/".to_string()];
    sdkignore.extend(default);

    let bytes = compress(path.display().to_string(), Some(sdkignore))?;
    encode_bytes_to_base_64(bytes).map_err(|e| e.to_string())
}

/// Search for .sdkignore file at `cwd`, if nothing is found, an empty `Vec` is returned
pub fn load_sdk_ignore_file() -> Result<Vec<String>, String> {
    let file = cwd()?
        .join(PathBuf::from(".sdkignore"))
        .display()
        .to_string();

    match path_exists(&file) {
        Ok(_) => read_text_file(file).map(|content| {
            content
                .lines()
                .filter_map(|line| {
                    if line.trim().is_empty() {
                        return None;
                    }
                    Some(line.to_owned())
                })
                .collect::<Vec<_>>()
        }),
        Err(_) => Ok(vec![]),
    }
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
