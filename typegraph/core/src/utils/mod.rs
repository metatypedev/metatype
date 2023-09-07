// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    wit::core::{Core, TypeBase, TypeId, TypeStruct},
    Lib,
};

impl crate::wit::utils::Utils for crate::Lib {
    fn gen_applyb(_supertype_id: TypeId, _apply: crate::wit::utils::Apply) -> Result<TypeId> {
        // Walk supertype and enumerate ALL possible paths
        // get that path

        // Note: if used out of scope even with proper imports Lib::some_type() panics
        let example = Lib::structb(TypeStruct { props: vec![] }, TypeBase::default())?;
        Ok(example)
    }
}
