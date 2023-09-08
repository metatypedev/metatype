// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    global_store::with_store,
    wit::core::{Core, TypeBase, TypeId, TypeStruct},
    Lib,
};

impl crate::wit::utils::Utils for crate::Lib {
    fn gen_applyb(supertype_id: TypeId, apply: crate::wit::utils::Apply) -> Result<TypeId> {
        // Walk supertype and enumerate ALL possible paths
        // get that path

        // let root_props: Vec<(String, u32)> = vec![];
        // let cache: HashMap<String, TypeId> = HashMap::new();

        for field in apply.paths {
            let _field_name = field.path.last().ok_or("invalid empty path encountered")?;
            let _id = with_store(|s| -> Result<u32, String> {
                let (_tpe, id) = s.get_type_by_path(supertype_id, &field.path)?;
                Ok(id)
            })?;

            // root_props.push((field_name.clone(), inner_tpe));
            if field.value.inherit {
                let _payload = field.value.payload.ok_or(format!(
                    "unable to set undefined payload at {:?}",
                    field.path.join(".")
                ))?;
            }
        }

        // Note: if used out of scope even with proper imports Lib::some_type() panics
        let example = Lib::structb(TypeStruct { props: vec![] }, TypeBase::default())?;
        Ok(example)
    }
}
