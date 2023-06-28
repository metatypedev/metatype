// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use insta::{assert_snapshot, glob};
use pathdiff::diff_paths;
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

fn test_files(glob: &str) {
    glob!(&get_test_dir(), glob, |path| {
        // use the same snapshots for different sdks
        let name = diff_paths(path, &get_test_dir())
            .unwrap()
            .with_extension("");
        let name = name.to_str().unwrap();
        println!("testing '{name}' {path:?}...");
        let tg = serialize(path);
        assert_snapshot!(name, tg);
    });
}

#[test]
fn test_python_sdk() {
    test_files("typegraphs/python/*.py");
}

#[test]
fn test_deno_sdk() {
    test_files("typegraphs/deno/*.ts");
}
