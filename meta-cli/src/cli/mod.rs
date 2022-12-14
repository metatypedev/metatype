// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::Result;
use std::path::PathBuf;

pub mod codegen;
pub mod deploy;
pub mod dev;
pub mod prisma;
pub mod serialize;

pub trait Action {
    fn run(&self, dir: String, config_path: Option<PathBuf>) -> Result<()>;
}
