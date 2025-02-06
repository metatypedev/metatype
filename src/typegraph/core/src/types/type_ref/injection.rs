// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{RefAttr, TypeRef};
use crate::types::Type;
use crate::wit::utils::ReduceEntry;
use crate::{errors::Result, wit::core::Error};
use indexmap::{map::Entry, IndexMap};
use serde::{Deserialize, Serialize};
use std::hash::{Hash, Hasher};
use tg_schema::{Injection, InjectionNode};

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct InjectionTree(pub IndexMap<String, InjectionNode>);

type InjectionTreeMap = IndexMap<String, InjectionNode>;

pub trait WithInjection {
    fn with_injection(self, injection: Injection) -> Result<TypeRef>;
}

impl<T> WithInjection for T
where
    T: TryInto<Type>,
    crate::errors::TgError: From<<T as TryInto<Type>>::Error>,
{
    fn with_injection(self, injection: Injection) -> Result<TypeRef> {
        TypeRef::from_type(self.try_into()?, RefAttr::Injection(injection)).register()
    }
}

pub trait OverrideInjections {
    fn override_injections(self, tree: InjectionTree) -> Result<TypeRef>;
}

impl<T> OverrideInjections for T
where
    T: TryInto<Type>,
    crate::errors::TgError: From<<T as TryInto<Type>>::Error>,
{
    fn override_injections(self, tree: InjectionTree) -> Result<TypeRef> {
        TypeRef::from_type(self.try_into()?, RefAttr::Reduce(tree)).register()
    }
}

impl TryFrom<Vec<ReduceEntry>> for InjectionTree {
    type Error = Error;
    fn try_from(entries: Vec<ReduceEntry>) -> Result<Self, Self::Error> {
        let mut tree = InjectionTree::default();
        for entry in entries {
            tree.add_reduce_entry(&entry.path, entry.injection_data)?;
        }
        Ok(tree)
    }
}

impl InjectionTree {
    fn add_reduce_entry(&mut self, path: &[String], data: String) -> Result<()> {
        let injection = serde_json::from_str(&data).map_err(|e| e.to_string())?;
        InjectionTree::add_reduce_entry_at(&mut self.0, path, injection)
    }

    fn add_reduce_entry_at(
        parent: &mut IndexMap<String, InjectionNode>,
        path: &[String],
        injection: Injection,
    ) -> Result<()> {
        match path.len() {
            0 => unreachable!(),
            1 => {
                let key = path[0].clone();
                match parent.entry(key) {
                    Entry::Occupied(_) => {
                        Err(format!("Duplicate injection at path {:?}", path).into())
                    }
                    Entry::Vacant(entry) => {
                        entry.insert(InjectionNode::Leaf { injection });
                        Ok(())
                    }
                }
            }
            2.. => {
                let key = path[0].clone();
                let node = parent.entry(key).or_insert(InjectionNode::Parent {
                    children: IndexMap::new(),
                });
                match node {
                    InjectionNode::Leaf { .. } => {
                        Err(format!("Injection already exists at path {:?}", path).into())
                    }
                    InjectionNode::Parent { children } => {
                        InjectionTree::add_reduce_entry_at(children, &path[1..], injection)
                    }
                }
            }
        }
    }

    pub fn merge(left: &mut InjectionTreeMap, right: InjectionTreeMap) {
        for (key, node) in right {
            match left.entry(key) {
                Entry::Occupied(mut entry) => match entry.get_mut() {
                    InjectionNode::Leaf { .. } => {
                        entry.insert(node); // replace
                    }
                    InjectionNode::Parent { children } => {
                        if let InjectionNode::Parent {
                            children: right_children,
                        } = node
                        {
                            InjectionTree::merge(children, right_children);
                        } else {
                            entry.insert(node);
                        }
                    }
                },
                Entry::Vacant(entry) => {
                    entry.insert(node);
                }
            }
        }
    }

    pub fn get_secrets(&self) -> Result<Vec<String>> {
        let mut collector = Vec::new();
        for node in self.0.values() {
            node.collect_secrets_into(&mut collector)?;
        }
        Ok(collector)
    }
}

impl Hash for InjectionTree {
    fn hash<H: Hasher>(&self, state: &mut H) {
        let mut keys = self.0.keys().collect::<Vec<_>>();
        keys.sort();

        for key in keys {
            key.hash(state);
            let node = self.0.get(key).unwrap();
            hash_injection_node(node, state);
        }
    }
}

fn hash_injection_node<H: Hasher>(node: &InjectionNode, state: &mut H) {
    match node {
        InjectionNode::Leaf { injection } => {
            "leaf".hash(state);
            injection.hash(state);
        }
        InjectionNode::Parent { children } => {
            "parent".hash(state);
            let mut keys = children.keys().collect::<Vec<_>>();
            keys.sort();
            for key in keys {
                key.hash(state);
                hash_injection_node(&children[key], state);
            }
        }
    }
}
