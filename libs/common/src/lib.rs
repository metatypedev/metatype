// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

pub mod archive;
pub mod typegraph;

pub fn get_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

pub fn is_dev() -> bool {
    cfg!(debug_assertions)
}
