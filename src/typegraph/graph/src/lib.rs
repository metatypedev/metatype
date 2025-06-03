// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

//! The typegraph expansion creates a version of the typegraph where type
//! references are inlined. This will remove the need to fetch from the array
//! of types each time. Also, it will eventually duplicate some types
//! according to the duplication mechanism based on the duplication keys
//! (`DupKey` trait).
//!
//! The expansion works in 3 passes:
//! - The first pass traverse the typegraph schema from the root using BFS.
//!   Each step will convert the type if it has not been converted yet.
//!   Also, the step will output the `LinkStep`, informing the system on how
//!   should the created type be associated with others.
//! - The second pass iterates through the created link steps. It sets the
//!   references to child types. This pass is necessary since the child types
//!   are not yet converted at each step. Recursive algorithm will not work
//!   since the graph might have cycles.
//! - The third pass traverse the generated graph, collected each types into
//!   the matching entry in the registry. It also serves as a validation step,
//!   ensuring that each converted type has valid references to their children.
//!   (FIXME: the third pass could be optional. But it is required for metagen,
//!   and currently, only metagen uses the expanded typegraph).

pub mod engines;
mod expansion;
pub mod injection;
mod key;
mod path;
mod policies;
mod runtimes;
mod type_registry;
mod types;
pub mod visitor;

mod interlude {
    pub use crate::engines::*;
    pub use crate::key::TypeKey;
    pub use color_eyre::{
        eyre::{bail, eyre},
        Result,
    };
    pub use std::sync::{Arc, OnceLock, Weak};
}

pub mod prelude {
    pub use crate::key::TypeKey;
    pub use crate::path::{PathSegment, RelativePath};
    pub use crate::types::*;
    pub use crate::Typegraph;
}

pub use crate::expansion::ExpansionConfig;
use expansion::MapItem;
use indexmap::IndexMap;
use interlude::*;
use runtimes::Materializer;
use std::collections::HashMap;
use tg_schema::runtimes::TGRuntime;
pub use types::*;

#[derive(Debug)]
pub struct Typegraph<K: DupKey = DefaultDuplicationKey> {
    pub schema: Arc<tg_schema::Typegraph>,
    pub root: Arc<ObjectType>,
    pub input_types: IndexMap<TypeKey, Type>,
    pub output_types: IndexMap<TypeKey, Type>,
    pub functions: IndexMap<u32, Arc<FunctionType>>,
    pub namespace_objects: IndexMap<Vec<Arc<str>>, Arc<ObjectType>>,
    pub disconnected_types: IndexMap<u32, Type>,
    pub named: HashMap<Arc<str>, Type>,
    pub conversion_map: Vec<MapItem<K>>,
    pub runtimes: Vec<Arc<TGRuntime>>,
    pub materializers: Vec<Materializer>,
}

impl<K: DupKey> Typegraph<K> {
    pub fn find_type(&self, key: TypeKey) -> Option<Type> {
        let TypeKey(idx, variant) = key;
        match self.conversion_map.get(idx as usize)? {
            MapItem::Unset => None,
            MapItem::Namespace(object, _) => Some(object.wrap()),
            MapItem::Function(function) => Some(function.wrap()),
            MapItem::Value(value) => Some(value.get(variant).unwrap().clone()),
        }
    }
}

impl<K: DupKey> Typegraph<K> {
    pub fn root_functions(&self) -> RootFnsIter {
        RootFnsIter {
            stack: vec![StackItem {
                ty: Type::Object(Arc::clone(&self.root)),
                path: vec![],
            }],
        }
    }

    pub fn name(&self) -> &str {
        self.root.title()
    }
}

struct StackItem {
    ty: Type,
    path: Vec<Arc<str>>,
}

pub struct RootFnsIter {
    stack: Vec<StackItem>,
}

impl Iterator for RootFnsIter {
    type Item = Result<(Vec<Arc<str>>, Arc<FunctionType>)>;

    fn next(&mut self) -> Option<Self::Item> {
        let item = self.stack.pop()?;
        match item.ty {
            Type::Object(object) => {
                self.stack.extend(
                    object
                        .properties()
                        .iter()
                        .map(|(name, prop)| StackItem {
                            ty: prop.ty.clone(),
                            path: {
                                let mut path = item.path.clone();
                                path.push(name.clone());
                                path
                            },
                        })
                        .rev(),
                );
                self.next()
            }
            Type::Function(function) => Some(Ok((item.path, function))),
            _ => Some(Err(eyre!(
                "unexpected type for root function: '{}'",
                item.ty.tag()
            ))),
        }
    }
}
