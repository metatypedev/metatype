// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[allow(unused_imports)]
use crate::wit::{expand_glob, print, read_file, write_file};
use std::fs::File;

#[allow(unused)]
pub fn read_text_file<P: Into<String>>(path: P) -> Result<String, String> {
    match read_file(&path.into()) {
        Ok(bytes) => {
            let s = std::str::from_utf8(&bytes).map_err(|e| e.to_string())?;
            Ok(s.to_owned())
        }
        Err(e) => Err(e),
    }
}

#[allow(unused)]
pub fn write_text_file<P: Into<String>, S: Into<String>>(path: P, text: S) -> Result<(), String> {
    write_file(&path.into(), text.into().as_bytes())
}

#[allow(unused)]
pub fn read_file_content<P: Into<String>>(path: P) -> Result<File, String> {
    todo!("implement")
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
