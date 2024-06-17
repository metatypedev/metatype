// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::fs::FsContext;
use common::archive::{
    archive_entries_from_bytes, encode_bytes_to_base_64, tarb64_unpack_entries_as_map,
};
use std::{collections::BTreeMap, path::Path};

pub trait ArchiveExt {
    fn compress_and_encode(&self, path: impl AsRef<Path>) -> Result<String, String>;
    fn unpack_base64(&self, tarb64: &str, dest: &Path) -> Result<(), String>;
}

impl FsContext {
    fn load_tg_ignore(&self, file: &Path) -> Result<Vec<String>, String> {
        if self.exists(file)? {
            let content = self.read_text_file(file)?;

            Ok(content
                .lines()
                .filter_map(|line| {
                    let trimmed = line.trim();
                    if trimmed.is_empty() || trimmed.starts_with('#') {
                        None
                    } else {
                        Some(line.to_string())
                    }
                })
                .collect::<Vec<_>>())
        } else {
            Ok(vec![])
        }
    }
}

impl ArchiveExt for FsContext {
    fn compress_and_encode(&self, path: impl AsRef<Path>) -> Result<String, String> {
        let path = path.as_ref();
        crate::logger::debug!("compress_and_encode: {path:?}");
        let ignore = {
            let tg_ignore_path = Path::new(".tgignore");
            let mut ignore = self.load_tg_ignore(tg_ignore_path)?;
            ignore.extend(["node_modules".to_string(), ".git".to_string()]);
            ignore
        };

        let paths = self.expand_path(path, &ignore)?;
        // TODO do not load everything in memory
        let entries = paths
            .iter()
            .map(|p| {
                let key = p.strip_prefix(path).unwrap().to_string_lossy().into();
                self.read_file(p).map(|content| (key, content))
            })
            .collect::<Result<BTreeMap<_, _>, _>>()?;

        crate::logger::debug!("archive entries: {entries:?}");
        let bytes = archive_entries_from_bytes(entries).map_err(|e| e.to_string())?;
        encode_bytes_to_base_64(bytes).map_err(|e| e.to_string())
    }

    fn unpack_base64(&self, tarb64: &str, dest: &Path) -> Result<(), String> {
        // TODO iterator instead of loading everything in memory
        let contents = tarb64_unpack_entries_as_map(Some(tarb64)).map_err(|e| e.to_string())?;

        for (path, bytes) in contents {
            self.write_file(&dest.join(path), &bytes)?;
        }

        Ok(())
    }
}
