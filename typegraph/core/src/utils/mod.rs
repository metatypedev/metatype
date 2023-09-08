// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::{
    errors::Result,
    global_store::with_store,
    types::{Type, TypeFun},
    wit::core::{Core, TypeBase, TypeId, TypeStruct, TypeWithInjection},
    Lib,
};

impl crate::wit::utils::Utils for crate::Lib {
    fn gen_applyb(supertype_id: TypeId, apply: crate::wit::utils::Apply) -> Result<TypeId> {
        // Walk supertype and enumerate ALL possible paths
        // get that path

        // let root_props: Vec<(String, u32)> = vec![];
        let mut obj_cache: HashMap<String, TypeId> = HashMap::new();

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

        for (path, _leaf_tpe_id) in finalized_paths.iter() {
            let _field_name = path.last().ok_or("invalid empty path encountered")?;
            let _id = with_store(|s| -> Result<u32, String> {
                let (_tpe, id) = s.get_type_by_path(supertype_id, path)?;
                Ok(id)
            })?;

            let mut curr_path = vec![];
            for chunk in path {
                curr_path.push(chunk.clone());
                let is_leaf = path.len() == curr_path.len();
                if !is_leaf {
                    let data = with_store(|s| -> Result<TypeStruct> {
                        let (tpe, _id) = s.get_type_by_path(supertype_id, &curr_path)?;
                        if let Type::Struct(t) = tpe {
                            return Ok(t.data.clone());
                        }
                        Err(format!(
                            "struct was expected, got {:?} at {}",
                            tpe.get_concrete_type_name(),
                            curr_path.join(".")
                        ))
                    })?;
                    let id = Lib::structb(data, TypeBase::default())?;
                    obj_cache.insert(curr_path.join("."), id);
                }
                // let new_id = Lib::structb(t.data.clone(), TypeBase::default());
            }

            // root_props.push((field_name.clone(), inner_tpe));
        }

        // Note: if used out of scope even with proper imports Lib::some_type() panics
        let example = Lib::structb(TypeStruct { props: vec![] }, TypeBase::default())?;

        Ok(example)
    }
}
