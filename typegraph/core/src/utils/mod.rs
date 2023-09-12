// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::{
    errors::Result,
    global_store::with_store,
    wit::core::{Core, TypeBase, TypeId, TypeStruct, TypeWithInjection},
    Lib,
};

mod apply;

impl crate::wit::utils::Utils for crate::Lib {
    fn gen_applyb(supertype_id: TypeId, apply: crate::wit::utils::Apply) -> Result<TypeId> {
        // Walk supertype and enumerate ALL possible paths
        // get that path

        let apply_tree = apply::PathTree::build_from(&apply)?;
        let item_list = apply::flatten_to_items_array(&apply_tree)?;
        let p2c_indices = apply::build_parent_to_child_indices(&item_list);

        if true {
            return Err(format!("!!! {:?}", p2c_indices));
        }

        // finalize all possible paths
        let mut finalized_paths: HashMap<Vec<String>, TypeId> = HashMap::new();
        for field in &apply.paths {
            let id = with_store(|s| -> Result<TypeId> {
                let id = s.get_type_by_path(supertype_id, &field.path)?.1;
                Ok(id)
            })?;
            if field.value.inherit {
                // keep id
                finalized_paths.insert(field.path.clone(), id);
            } else {
                // use WithInjection id
                let payload = field.value.payload.clone().ok_or(format!(
                    "cannot set undefined value at {:?}",
                    field.path.join(".")
                ))?;
                let new_id = Lib::with_injection(TypeWithInjection {
                    tpe: id,
                    injection: payload,
                })?;
                finalized_paths.insert(field.path.clone(), new_id);
            }
        }

        // Note: if used out of scope even with proper imports Lib::some_type() panics
        let example = Lib::structb(TypeStruct { props: vec![] }, TypeBase::default())?;

        Ok(example)
    }
}
