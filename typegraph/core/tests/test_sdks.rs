// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::archive::{flat_list_dir, unpack_tar_base64};
use insta::{assert_snapshot, glob};
use pathdiff::diff_paths;
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

fn serialize(path: &Path) -> String {
    let out = Command::new("cargo")
        .args(&[
            "run",
            "-p",
            "meta-cli",
            "-q",
            "-F",
            "typegraph-next",
            "--",
            "serialize",
            "--pretty",
            "-f",
        ])
        .arg(path)
        .current_dir(&get_test_dir())
        .stderr(Stdio::inherit())
        .output()
        .expect("failed to execute process")
        .stdout;
    String::from_utf8(out).unwrap()
}

fn get_workspace_dir() -> PathBuf {
    let out = Command::new("cargo")
        .args(&["locate-project", "--workspace", "--message-format=plain"])
        .output()
        .expect("failed to execute process")
        .stdout;
    let workspace = std::str::from_utf8(&out).unwrap().trim();
    Path::new(workspace).parent().unwrap().into()
}

fn get_test_dir() -> PathBuf {
    get_workspace_dir()
        .join(std::file!())
        .parent()
        .unwrap()
        .into()
}

fn replace_b64_to_entries(tg: String) -> String {
    let mut arr: Value = serde_json::from_str(&tg).unwrap();
    assert!(arr.is_array());
    let object = arr.get_mut(0).unwrap();
    if let Some(materializers) = object.get("materializers") {
        let new_list: Vec<Value> = materializers
            .as_array()
            .unwrap()
            .iter()
            .map(|value| {
                let mut new_value = value.clone();
                if let Some(data) = value.get("data") {
                    if let Some(code) = data.as_object().unwrap().get("code") {
                        let base64 = code
                            .as_str()
                            .unwrap()
                            .split(&"base64:")
                            .last()
                            .unwrap()
                            .to_owned();
                        let tmp = "tmp/unpacked";
                        // unpack
                        unpack_tar_base64(base64, tmp).unwrap();
                        // then read
                        let content = flat_list_dir(tmp).unwrap().join(",");
                        // now replace
                        new_value["data"]["code"] =
                            serde_json::from_str(&format!("\"{}\"", content)).unwrap();
                    }
                }
                new_value
            })
            .collect();
        object["materializers"] = Value::from(new_list);
        return serde_json::to_string_pretty(&arr).unwrap();
    }
    tg
}

fn test_files(glob: &str) {
    glob!(&get_test_dir(), glob, |path| {
        // use the same snapshots for different sdks
        let name = diff_paths(path, &get_test_dir())
            .unwrap()
            .with_extension("");
        let name = name.to_str().unwrap();
        println!("testing '{name}' {path:?}...");
        let tg = serialize(path);
        let tg = replace_b64_to_entries(tg);
        assert_snapshot!(name, tg);
    });
}

#[test]
fn test_python_sdk() {
    test_files("typegraphs/*.py");
}

#[test]
fn test_deno_sdk() {
    test_files("typegraphs/*.ts");
}
