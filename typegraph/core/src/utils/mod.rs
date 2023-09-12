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
        let apply_tree = apply::PathTree::build_from(&apply)?;
        let mut item_list = apply::flatten_to_sorted_items_array(&apply_tree)?;
        let p2c_indices = apply::build_parent_to_child_indices(&item_list);
        // item_list index => (node name, store id)
        let mut idx_to_store_id_cache: HashMap<u32, (String, u32)> = HashMap::new();

        while !item_list.is_empty() {
            let item = match item_list.pop() {
                Some(value) => value,
                None => break,
            };

            if item.node.is_leaf() {
                let path_infos = item.node.path_infos;
                let apply_value = path_infos.value;
                let id = with_store(|s| -> Result<TypeId> {
                    let id = s.get_type_by_path(supertype_id, &path_infos.path)?.1;
                    Ok(id)
                })?;

                if apply_value.inherit {
                    // if inherit, keep original id
                    idx_to_store_id_cache.insert(item.index, (item.node.name, id));
                } else {
                    // has static injection
                    let payload = apply_value.payload.ok_or(format!(
                        "cannot set undefined value at {:?}",
                        path_infos.path.join(".")
                    ))?;
                    let new_id = Lib::with_injection(TypeWithInjection {
                        tpe: id,
                        injection: payload,
                    })?;

                    idx_to_store_id_cache.insert(item.index, (item.node.name, new_id));
                }
            } else {
                // parent node => must be a struct
                // * assume child ids are already in cache
                let child_indices = p2c_indices.get(&item.index).unwrap();
                if child_indices.is_empty() {
                    return Err(format!("parent item at index {} has no child", item.index));
                }

                let mut props = vec![];
                for idx in child_indices {
                    let prop = idx_to_store_id_cache.get(idx).ok_or(format!(
                        "store id for item at index {idx} was not yet generated"
                    ))?;
                    props.push(prop.clone());
                }

                let id = Lib::structb(TypeStruct { props }, TypeBase::default())?;
                idx_to_store_id_cache.insert(item.index, (item.node.name, id));
            }
        }

        let (_root_name, root_id) = idx_to_store_id_cache
            .get(&0)
            .ok_or("root type does not have any field".to_string())?;

        // if true {
        //     return Err(format!(
        //         "{_root_name} with cache {:?}",
        //         idx_to_store_id_cache
        //     ));
        // }

        Ok(*root_id)
    }
}
