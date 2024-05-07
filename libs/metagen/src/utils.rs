// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

trait GenDest {}

/// A generation destination analogous to a single file.
pub struct GenDestBuf {
    pub buf: String,
}
impl GenDest for GenDestBuf {}

/// A generation destination analogous to a directory.
pub struct GenDestFs {
    pub files: HashMap<String, GenDestBuf>,
}
impl GenDest for GenDestFs {}
