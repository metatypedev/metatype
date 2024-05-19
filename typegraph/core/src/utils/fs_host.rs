// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{
    collections::HashSet,
    path::{Path, PathBuf},
};

use crate::{
    global_store::Store,
    wit::metatype::typegraph::host::{
        expand_glob, expand_path as expand_path_host, get_cwd, path_exists as path_exists_host,
        read_file, write_file,
    },
};
use common::archive::{
    archive_entries_from_bytes, encode_bytes_to_base_64, tarb64_unpack_entries_as_map,
};
use indexmap::IndexMap;
use sha2::{Digest, Sha256};

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
    if paths.len() <= 1 {
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

    // ambiguous case, assume it is under cwd
    if paths.len() == 1 {
        let possible_base = cwd()?;
        return paths[0]
            .strip_prefix(&possible_base)
            .map(|stripped| vec![stripped.to_owned()])
            .map_err(|_| format!("{:?} does not contain path", possible_base.display()));
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

pub fn expand_path(path: &Path, exclude_glob: &[String]) -> Result<Vec<PathBuf>, String> {
    let exclude_as_regex = exclude_glob
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

    let ret = expand_path_host(&path.display().to_string(), &exclude_as_regex)?
        .iter()
        .map(PathBuf::from)
        .collect();
    Ok(ret)
}

pub fn compress<P: Into<String>>(path: P, exclude: Option<Vec<String>>) -> Result<Vec<u8>, String> {
    // Note: each exclude entry is a regex pattern
    let exclude = exclude.unwrap_or_default();
    let paths = expand_path(&PathBuf::from(path.into()), &exclude)?;
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
    let mut tgignore = load_tg_ignore_file()?;
    let default = vec!["node_modules".to_string(), ".git".to_string()];
    tgignore.extend(default);

    let bytes = compress(path.display().to_string(), Some(tgignore))?;
    encode_bytes_to_base_64(bytes).map_err(|e| e.to_string())
}

/// Search for .tgignore file at `cwd`, if nothing is found, an empty `Vec` is returned
pub fn load_tg_ignore_file() -> Result<Vec<String>, String> {
    let file = cwd()?.join(".tgignore");

    match path_exists(&file)? {
        true => read_text_file(file.to_string_lossy()).map(|content| {
            content
                .lines()
                .filter_map(|line| {
                    let trimmed = line.trim();
                    if trimmed.is_empty() || trimmed.starts_with('#') {
                        return None;
                    }
                    Some(line.to_owned())
                })
                .collect()
        }),
        false => Ok(vec![]),
    }
}

/// Returns `get_cwd()` by default, custom `dir` otherwise
pub fn cwd() -> Result<PathBuf, String> {
    match Store::get_deploy_cwd() {
        Some(path) => Ok(path),
        None => Ok(PathBuf::from(get_cwd()?.to_owned())),
    }
}

/// Strip given path with `cwd`
#[allow(dead_code)]
pub fn make_relative(path: &Path) -> Result<PathBuf, String> {
    path.strip_prefix(cwd()?)
        .map_err(|e| e.to_string())
        .map(|r| r.to_owned())
}

/// Join given path with `cwd`
pub fn make_absolute(path: &Path) -> Result<PathBuf, String> {
    match path.is_relative() {
        true => Ok(cwd()?.join(path)),
        false => Ok(path.to_owned()),
    }
}

// TODO: use smaller buffer?
pub fn hash_file(path: &Path) -> Result<(String, u32), String> {
    let mut sha256 = Sha256::new();
    let bytes = read_file(&path.to_string_lossy())?;
    let size = bytes.len() as u32;
    sha256.update(bytes);
    Ok((format!("{:x}", sha256.finalize()), size))
}

pub fn path_exists(path: &Path) -> Result<bool, String> {
    path_exists_host(&path.to_string_lossy())
}

pub fn is_glob(path: &str) -> bool {
    let path = PathBuf::from(path);
    if let Some(base_name) = path.file_name() {
        let base_name = base_name.to_str().unwrap();
        if base_name.contains('*') || base_name.contains('?') {
            return true;
        }
    }

    false
}

pub fn resolve_globs_dirs(deps: Vec<String>) -> Result<Vec<PathBuf>, String> {
    let mut resolved_deps = HashSet::new();
    for dep in deps {
        if is_glob(&dep) {
            let abs_path = make_absolute(&PathBuf::from(dep))?
                .to_string_lossy()
                .to_string();
            let matching_files = expand_glob(&abs_path)?;
            for file in matching_files {
                let rel_path = make_relative(&PathBuf::from(file))?;
                resolved_deps.insert(rel_path);
            }
        } else {
            let all_files = expand_path(&make_absolute(&PathBuf::from(dep))?, &[])?;
            for file in all_files {
                let rel_path = make_relative(&file)?;
                resolved_deps.insert(rel_path);
            }
        }
    }

    Ok(resolved_deps.into_iter().collect())
}
