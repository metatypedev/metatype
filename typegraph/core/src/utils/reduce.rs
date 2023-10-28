// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::{
    errors::Result,
    wit::utils::{Reduce, ReducePath, ReduceValue},
};

#[derive(Debug, Clone)]
pub struct PathTree {
    pub entries: Vec<PathTree>,
    pub name: String,
    pub path_infos: ReducePath,
}

impl PathTree {
    fn new(name: String, path_infos: ReducePath) -> PathTree {
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
        description: &ReducePath,
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

    pub fn build_from(reduce: &Reduce) -> Result<PathTree, String> {
        let mut root = PathTree::new(
            "root".to_string(),
            ReducePath {
                path: vec![],
                value: ReduceValue {
                    inherit: false,
                    payload: None,
                },
            },
        );
        for descr in reduce.paths.iter() {
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
