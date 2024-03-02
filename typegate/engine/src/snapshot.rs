// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use deno::deno_runtime::ops::bootstrap::SnapshotOptions;
use mt_deno::deno;

pub fn create_snapshot(snapshot_path: std::path::PathBuf) {
    // let cli_snapshot_path = PathBuf::from(env::var_os("OUT_DIR").unwrap()).join("CLI_SNAPSHOT.bin");

    let snapshot_options = SnapshotOptions {
        // NOTE: keep this in sync
        deno_version: "1.41.0".into(),
        // NOTE: keep this in sync with deno/cli/tsc/00_typescript.js / version = "\d.\d.\d"
        ts_version: "5.3.3".into(),
        v8_version: deno::deno_runtime::deno_core::v8_version(),
        target: std::env::var("TARGET").unwrap(),
    };

    deno::deno_runtime::snapshot::create_runtime_snapshot(
        snapshot_path,
        snapshot_options,
        crate::extensions(crate::OpDepInjector::for_snapshot()),
    );
}
