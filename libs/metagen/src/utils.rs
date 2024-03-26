// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

trait GenDest {}

pub struct GenDestBuf {
    pub buf: String,
}
impl GenDest for GenDestBuf {}

pub struct GenDestFs {
    pub files: HashMap<String, GenDestBuf>,
}
impl GenDest for GenDestFs {}

trait Generate {
    type Dest: GenDest;

    fn generate(&self, dest: &mut Self::Dest) -> anyhow::Result<()>;
}
