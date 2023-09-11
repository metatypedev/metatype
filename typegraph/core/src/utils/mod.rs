// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::{
    errors::Result,
    global_store::with_store,
    types::{Type, TypeFun},
    wit::{
        core::{Core, TypeBase, TypeId, TypeStruct, TypeWithInjection},
        utils::{Apply, ApplyPath, ApplyValue},
    },
    Lib,
};

#[derive(Debug, Clone)]
struct PathTree {
    // pub parent: Option<&'a mut Box<PathTree<'a>>>,
    pub entries: Vec<PathTree>,
    pub name: String,
    pub value: ApplyValue,
}

impl PathTree {
    fn new(name: String, value: ApplyValue) -> PathTree {
        Self {
            entries: vec![],
            name,
            value,
        }
    }

    // pub fn is_leaf(&self) -> bool {
    //     self.entries.len() == 0
    // }

    fn build_helper(
        parent: &mut PathTree,
        description: &ApplyPath,
        depth: usize,
    ) -> Result<(), String> {
        if depth < description.path.len() {
            let item = &description.path[depth];
            let child = match parent.find(item) {
                Some(child) => child,
                None => {
                    parent.add(PathTree::new(item.to_string(), description.value.clone()));
                    parent
                        .find(item)
                        .ok_or("node incorrectly added into tree".to_string())?
                }
            };
            PathTree::build_helper(child, description, depth + 1)?
        }
        Ok(())
    }

    pub fn build_from(apply: &Apply) -> Result<PathTree, String> {
        let mut root = PathTree::new(
            "root".to_string(),
            ApplyValue {
                inherit: false,
                payload: None,
            },
        );
        for descr in apply.paths.iter() {
            PathTree::build_helper(&mut root, descr, 0)?;
        }
        Ok(root)
    }

    pub fn find(&mut self, other_name: &str) -> Option<&mut PathTree> {
        self.entries
            .iter_mut()
            .find(|entry| entry.name.eq(other_name))
    }

    pub fn add(&mut self, entry: PathTree) {
        self.entries.push(entry);
    }

    fn print_helper(lines: &mut String, node: &PathTree, depth: u32) {
        if depth == 0 {
            lines.push_str(&node.name);
        } else {
            let name = node.name.clone();
            let inherit = node.value.inherit;
            lines.push_str(&format!(
                "{:indent$}└── [{name} ({inherit})]",
                "",
                indent = ((depth as usize) - 1) * 4
            ));
        }

        for entry in node.entries.iter() {
            PathTree::print_helper(lines, entry, depth + 1)
        }
    }
}

impl ToString for PathTree {
    fn to_string(&self) -> String {
        let mut lines = String::new();
        PathTree::print_helper(&mut lines, self, 0);
        lines
    }
}

impl crate::wit::utils::Utils for crate::Lib {
    fn gen_applyb(supertype_id: TypeId, apply: crate::wit::utils::Apply) -> Result<TypeId> {
        // Walk supertype and enumerate ALL possible paths
        // get that path

        let _apply_tree = PathTree::build_from(&apply)?;

        // print_tree(&apply_tree, 0);

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
