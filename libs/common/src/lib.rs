// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

pub mod typegraph;

pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

pub fn is_dev() -> bool {
    cfg!(debug_assertions)
}
