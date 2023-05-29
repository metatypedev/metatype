// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::process::Command;

#[test]
fn test_invalid_injections() {
    let status = Command::new("cargo")
        .args(["build", "-p", "meta-cli", "--quiet"])
        .status()
        .expect("failed to execute build for meta-cli");
    assert!(status.success(), "`cargo build -p meta-cli` failed");

    let root = project_root::get_project_root().unwrap();
    let bin = root.join("target/debug/meta");
    let output = Command::new(bin)
        .args(["serialize", "-f", "tests/e2e/typegraphs/validator.py"])
        .env("RUST_LOG", "error")
        .output()
        .expect("failed to execute process");

    assert!(!output.status.success());
    insta::assert_snapshot!(
        "invalid_injections",
        String::from_utf8(output.stderr).expect("failed to decode output")
    );
}
