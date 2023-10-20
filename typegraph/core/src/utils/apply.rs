// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use common::typegraph::{Injection, InjectionData};

use crate::{
    errors::{expect_inferable_type, Result},
    wit::utils::{Apply, ApplyPath, ApplyValue},
};

#[derive(Debug, Clone)]
pub struct PathTree {
    pub entries: Vec<PathTree>,
    pub name: String,
    pub path_infos: ApplyPath,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Eq)]
pub enum ApplyTypeHint {
    Number,
    String,
    Boolean,
    Object,
    Struct,
    Array(Box<ApplyTypeHint>),
    Relative,
}

impl PartialEq for ApplyTypeHint {
    fn eq(&self, other: &Self) -> bool {
        format!("{:?}", self) == format!("{:?}", other)
    }
}

impl PathTree {
    fn new(name: String, path_infos: ApplyPath) -> PathTree {
        Self {
            entries: vec![],
            name,
            path_infos,
        }
    }

    pub fn is_leaf(&self) -> bool {
        self.entries.is_empty()
    }

    fn build_helper(
        parent: &mut PathTree,
        description: &ApplyPath,
        depth: usize,
    ) -> Result<(), String> {
        if depth < description.path.len() {
            let chunk = &description.path[depth];
            let child = match parent.find(chunk) {
                Some(child) => child,
                None => {
                    parent.add(PathTree::new(chunk.to_string(), description.clone()));
                    parent
                        .find(chunk)
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
            ApplyPath {
                path: vec![],
                value: ApplyValue {
                    inherit: false,
                    payload: None,
                },
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
        if depth >= 1 {
            let name = node.name.clone();
            let payload = node
                .path_infos
                .value
                .payload
                .clone()
                .unwrap_or("--".to_string());
            let spaces = 4;
            let symbol = if node.entries.len() == 1 || depth != 0 {
                "└─"
            } else {
                "├─"
            };
            lines.push_str(&format!(
                "{:indent$}{symbol} [{name} ({payload})]",
                "",
                indent = ((depth as usize) - 1) * spaces
            ));
        } else {
            lines.push_str(&node.name);
        }

        for entry in node.entries.iter() {
            PathTree::print_helper(lines, entry, depth + 1);
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

// Type utility for wrapping a node with index information
#[derive(Debug, Clone)]
pub struct ItemNode<'a> {
    pub parent_index: Option<u32>,
    pub index: u32,
    pub node: &'a PathTree,
}

// Scheme similar to `types: TypeNode[]` in typegate
// Item node wrappers are ordered in such a way that
// 1. The last items are the leaves
// 2. The first item is guaranteed to be the root node
pub fn flatten_to_sorted_items_array(path_tree: &PathTree) -> Result<Vec<ItemNode>, String> {
    let mut index = 0;
    let mut levels = vec![vec![ItemNode {
        parent_index: None,
        index,
        node: path_tree,
    }]];

    loop {
        let previous_level = levels.last();
        match previous_level {
            Some(parents) => {
                let mut current_level = vec![];
                for parent in parents {
                    for entry in parent.node.entries.iter() {
                        index += 1;
                        current_level.push(ItemNode {
                            parent_index: Some(parent.index),
                            index,
                            node: entry,
                        });
                    }
                }
                if current_level.is_empty() {
                    // all nodes traversed
                    break;
                }
                levels.push(current_level);
            }
            None => panic!("first level must be populated"),
        }
    }

    // flatten the tree to a 1D array
    let final_size = (index + 1) as usize;
    let mut tmp_result = vec![None; final_size];

    for level in levels {
        for item in level {
            let pos = item.index as usize;
            match tmp_result.get(pos).unwrap() {
                None => {
                    tmp_result[pos] = Some(item);
                }
                Some(value) => {
                    return Err(format!(
                        "index {} is already filled with {:?}",
                        item.index, value
                    ))
                }
            }
        }
    }

    let mut result = vec![];
    for (i, item) in tmp_result.iter().enumerate() {
        result.push(item.clone().ok_or(format!("index {} is vacant", i))?)
    }

    Ok(result)
}

pub fn build_parent_to_child_indices(item_list: &Vec<ItemNode>) -> HashMap<u32, Vec<u32>> {
    let mut map: HashMap<u32, Vec<u32>> = HashMap::new();
    for item in item_list {
        if let Some(parent_index) = item.parent_index {
            map.entry(parent_index).or_default().push(item.index);
        }
    }
    map
}

pub fn get_hint_from_json_value(
    value: &serde_json::Value,
    path: &[String],
) -> Result<ApplyTypeHint> {
    match value {
        serde_json::Value::Bool(_) => Ok(ApplyTypeHint::Boolean),
        serde_json::Value::Number(_) => Ok(ApplyTypeHint::Number),
        serde_json::Value::String(_) => Ok(ApplyTypeHint::Boolean),
        serde_json::Value::Object(_) => Ok(ApplyTypeHint::Struct),
        serde_json::Value::Array(v) => {
            // top level information is enough
            if let Some(first) = v.first() {
                let of = get_hint_from_json_value(first, path)?;
                return Ok(ApplyTypeHint::Array(Box::new(of)));
            }
            Err(expect_inferable_type(
                format!("{:?} (empty list)", value.to_string()),
                path,
            ))
        }
        serde_json::Value::Null => Err(expect_inferable_type(value.to_string(), path)),
    }
}

pub fn get_hint_from_injection_string(
    data: InjectionData<String>,
    path: &[String],
) -> Result<ApplyTypeHint> {
    match data {
        InjectionData::SingleValue(single) => {
            let value: serde_json::Value =
                serde_json::from_str(&single.value).map_err(|e| e.to_string())?;
            get_hint_from_json_value(&value, path)
        }
        InjectionData::ValueByEffect(per_effect) => {
            if per_effect.is_empty() {
                return Err(format!(
                    "invalid state: per effect object cannot be empty at {:?}",
                    path.join("."),
                )
                .into());
            }
            let mut hint: Option<ApplyTypeHint> = None;
            for (_, v) in per_effect.iter() {
                let value: serde_json::Value =
                    serde_json::from_str(v).map_err(|e| e.to_string())?;
                let curr_hint = get_hint_from_json_value(&value, path)?;
                if let Some(hint) = hint {
                    if !hint.eq(&curr_hint) {
                        return Err(format!(
                            "unable to infer type, per effect object has ambiguous values at {:?}",
                            path.join("."),
                        )
                        .into());
                    }
                }
                hint = Some(curr_hint);
            }
            Ok(hint.unwrap())
        }
    }
}

/// Tries to infer the type.
/// Return `Relative` if type deduction depends on a given supertype
pub fn infer_type(apply_path: &ApplyPath) -> Result<ApplyTypeHint> {
    let path_str = apply_path.path.join(".");
    let payload = apply_path
        .value
        .clone()
        .payload
        .ok_or_else(|| format!("cannot infer type from a null payload {path_str}"))?;
    let injection: Injection = serde_json::from_str(&payload).map_err(|e| e.to_string())?;

    match injection {
        Injection::Static(value) => get_hint_from_injection_string(value, &apply_path.path),
        Injection::Context(value) => get_hint_from_injection_string(value, &apply_path.path),
        // walk the path and retrieve first compatible union variant
        // if two variants has the same field but different type, return ambiguous error
        Injection::Secret(_) => Ok(ApplyTypeHint::Relative),
        Injection::Dynamic(_) => todo!(),
        Injection::Parent(_) => todo!(),
    }
}
