// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

pub mod archive;
pub mod typegraph;

pub fn get_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
