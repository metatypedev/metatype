// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{TypeBase, TypeNode};

#[derive(Debug)]
pub struct FileType {
    pub base: TypeBase,
    pub min_size: Option<u32>,
    pub max_size: Option<u32>,
    pub mime_types: Option<Vec<String>>,
}

impl TypeNode for FileType {
    fn base(&self) -> &TypeBase {
        &self.base
    }
}
