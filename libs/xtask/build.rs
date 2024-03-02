// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

fn main() {
    let snapshot_path =
        std::path::PathBuf::from(std::env::var_os("OUT_DIR").unwrap()).join("SNAPSHOT.bin");
    typegate_engine::create_snapshot(snapshot_path);
}
