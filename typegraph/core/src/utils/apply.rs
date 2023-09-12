// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::{
    errors::Result,
    wit::utils::{Apply, ApplyPath, ApplyValue},
};

#[derive(Debug, Clone)]
pub struct PathTree {
    pub entries: Vec<PathTree>,
    pub name: String,
    pub path_infos: ApplyPath,
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
        if depth == 0 {
            lines.push_str(&node.name);
        } else {
            let name = node.name.clone();
            let inherit = node.path_infos.value.inherit;
            lines.push_str(&format!(
                "{:indent$}└── [{name} ({inherit})]",
                "",
                indent = ((depth as usize) - 1) * 4
            ));
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
pub struct ItemNode {
    pub parent_index: Option<u32>,
    pub index: u32,
    pub node: PathTree,
}

// scheme similar to `types: TypeNode[]` in typegate
// Item node wrappers are ordered in such a way that
// 1. the last items are the leaves
// 2. first item is guaranteed to be the root node
pub fn flatten_to_sorted_items_array(path_tree: &PathTree) -> Result<Vec<ItemNode>, String> {
    let mut index = 0;
    let mut levels = vec![vec![ItemNode {
        parent_index: None,
        index,
        node: path_tree.clone(),
    }]];

    loop {
        if let Some(parents) = levels.last() {
            let mut current: Vec<ItemNode> = vec![];
            for parent in parents {
                for entry in parent.node.entries.iter() {
                    index += 1;
                    current.push(ItemNode {
                        parent_index: Some(parent.index),
                        index,
                        node: entry.clone(),
                    });
                }
            }
            if current.is_empty() {
                // all leaves reached
                break;
            }
            levels.push(current);
        } else {
            panic!("first level must be populated");
        }
    }

    // flatten the tree to a 1D array
    let final_size = (index + 1) as usize;
    let mut tmp_list = vec![None; final_size];

    for level in levels {
        for entity in level {
            let pos = entity.index as usize;
            match tmp_list.get(pos).unwrap() {
                None => {
                    tmp_list[pos] = Some(entity);
                }
                Some(value) => {
                    return Err(format!(
                        "index {} is already filled with {:?}",
                        entity.index, value
                    ))
                }
            }
        }
    }

    let mut result = vec![];
    for (i, item) in tmp_list.iter().enumerate() {
        result.push(item.clone().ok_or(format!("index {} is vacant", i))?)
    }

    Ok(result)
}

pub fn build_parent_to_child_indices(item_list: &Vec<ItemNode>) -> HashMap<u32, Vec<u32>> {
    let mut map: HashMap<u32, Vec<u32>> = HashMap::new();

    for item in item_list {
        if let Some(parent_index) = item.parent_index {
            map.entry(parent_index).or_insert_with(Vec::new);
            map.get_mut(&parent_index).unwrap().push(item.index);
        }
    }

    map
}
