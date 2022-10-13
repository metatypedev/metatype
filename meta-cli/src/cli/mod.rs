// Copyright Metatype under the Elastic License 2.0.

use anyhow::Result;

pub mod codegen;
pub mod deploy;
pub mod dev;
pub mod prisma;
pub mod serialize;

pub trait Action {
    fn run(&self, dir: String) -> Result<()>;
}
