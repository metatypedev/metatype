// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::Arc;

use super::{TypeBase, TypeNode};

#[derive(Debug)]
pub struct FileType {
    pub base: TypeBase,
    pub min_size: Option<u32>,
    pub max_size: Option<u32>,
    pub mime_types: Option<Vec<String>>,
}

impl TypeNode for Arc<FileType> {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn tag(&self) -> &'static str {
        "file"
    }
}

impl FileType {
    pub fn is_plain(&self) -> bool {
        matches!(
            (self.min_size, self.max_size, self.mime_types.as_ref()),
            (None, None, None)
        )
    }
}
