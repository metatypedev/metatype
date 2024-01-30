// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::archive::archive_entries_from_bytes;
use indexmap::IndexMap;

#[allow(unused_imports)]
use crate::wit::{expand_glob, print, read_file, write_file};

#[allow(unused)]
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

#[allow(unused)]
pub fn compress_folder<P: Into<String>>(path: P) -> Result<Option<Vec<u8>>, String> {
    let exclude = &["node_modules".to_string()];
    let paths = expand_glob(&path.into(), exclude)?;
    let mut entries = IndexMap::new();
    for path in paths {
        entries.insert(path.clone(), read_file(&path.clone())?);
        print(&format!("Entry {:?}", path.clone()));
    }

    archive_entries_from_bytes(entries).map_err(|e| e.to_string())
}

// expand_glob(".", &["node_module".to_owned()])
// .map(|r| print(&format!("value {:?}", r).to_string()))
// .ok();
// match read_file("./sample.txt") {
// Ok(res) => {
//     print("OK");
//     print(&format!("received len {}", res.len()));
//     print(&format!("Content from bytes{:?}", std::str::from_utf8(res)));
// }
// Err(e) => print(&format!("{:?}", e)),
// }
