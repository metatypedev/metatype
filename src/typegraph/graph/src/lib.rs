// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod conv;
pub mod naming;
mod path;
mod policies;
mod runtimes;
mod types;
pub mod visitor;

mod interlude {
    pub use std::sync::Arc;
    pub use std::sync::Weak;
    pub type Lazy<T> = std::sync::OnceLock<T>;
    pub use color_eyre::{
        eyre::{bail, eyre},
        Result,
    };
}

pub mod prelude {
    pub use crate::conv::key::TypeKey;
    pub use crate::path::{PathSegment, RelativePath};
    pub use crate::types::*;
    pub use crate::Typegraph;
}

use conv::{key::TypeKey, ValueType};
use indexmap::IndexMap;
use interlude::*;
use naming::DefaultNamingEngine;
use runtimes::Materializer;
use std::collections::HashMap;
use tg_schema::runtimes::TGRuntime;
pub use types::*;

#[derive(Debug)]
pub enum MapItem {
    Namespace(Arc<ObjectType>, Vec<Arc<str>>),
    Function(Arc<FunctionType>),
    Value(ValueType),
}

impl TryFrom<conv::MapItem> for MapItem {
    type Error = color_eyre::Report;

    fn try_from(value: conv::MapItem) -> Result<Self> {
        Ok(match value {
            conv::MapItem::Unset => bail!("type was not converted"),
            conv::MapItem::Namespace(object, path) => MapItem::Namespace(object, path),
            conv::MapItem::Function(function) => MapItem::Function(function),
            conv::MapItem::Value(value) => MapItem::Value(value),
        })
    }
}

#[derive(Debug)]
pub struct Typegraph {
    pub schema: Arc<tg_schema::Typegraph>,
    pub root: Arc<ObjectType>,
    pub input_types: IndexMap<TypeKey, Type>,
    pub output_types: IndexMap<TypeKey, Type>,
    pub functions: IndexMap<u32, Arc<FunctionType>>,
    pub namespace_objects: IndexMap<Vec<Arc<str>>, Arc<ObjectType>>,
    pub named: HashMap<Arc<str>, Type>,
    pub conversion_map: Vec<MapItem>,
    pub runtimes: Vec<Arc<TGRuntime>>,
    pub materializers: Vec<Materializer>,
}

impl Typegraph {
    pub fn find_type(&self, key: TypeKey) -> Option<Type> {
        let TypeKey(idx, variant) = key;
        match self.conversion_map.get(idx as usize)? {
            MapItem::Namespace(object, _) => Some(object.wrap()),
            MapItem::Function(function) => Some(function.wrap()),
            MapItem::Value(value) => Some(value.get(variant).unwrap().ty.clone()),
        }
    }
}

impl TryFrom<Arc<tg_schema::Typegraph>> for Typegraph {
    type Error = color_eyre::Report;
    fn try_from(schema: Arc<tg_schema::Typegraph>) -> Result<Self> {
        conv::Conversion::convert(schema, DefaultNamingEngine::default())
    }
}

impl Typegraph {
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
    // Item = Result<Arc<FunctionType>, Error>;
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
                            ty: prop.type_.clone(),
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
