// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;
use typegraph::conv::TypeKey;

pub type VisitedTypePaths = IndexMap<Arc<str>, Vec<Vec<Arc<str>>>>;

/// This type tracks the type graph traversal path.
pub struct VisitCursor {
    pub node: Type,
    pub path: Vec<Arc<str>>,
    pub visited_path: VisitedTypePaths,
}

/// Most languages don't need to generate bodies for all types
/// types and usually only need reference to the built-in primitives.
/// This function encodes that logic for the common case but won't
/// apply to all langauges.
///
/// To be specific, it returns true for all but the simple primitive types.
/// It also returns true if the primitive has a user defined alias,
/// type validator and other interesting metadata.
pub fn type_body_required(ty: &Type) -> bool {
    match ty {
        // functions will be absent in our gnerated types
        Type::Function { .. } => false,
        // under certain conditionds, we don't want to generate aliases
        // for primitive types. this includes
        // - types with default generated names
        // - types with no special semantics
        Type::Boolean(t) if t.base.title.starts_with("boolean_") => false,
        Type::Integer(ty) if ty.is_plain() && ty.base.title.starts_with("integer_") => false,
        Type::Float(ty) if ty.is_plain() && ty.base.title.starts_with("float_") => false,
        Type::String(ty) if ty.is_plain() && ty.base.title.starts_with("string_") => false,
        Type::File(ty) if ty.is_plain() && ty.base.title.starts_with("file_") => false,
        _ => true,
    }
}

pub trait NameMemo {
    fn get(&self, key: TypeKey) -> Option<&str>;
}

pub struct EmptyNameMemo;
impl NameMemo for EmptyNameMemo {
    fn get(&self, _key: TypeKey) -> Option<&str> {
        None
    }
}
