// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod conv;
pub mod naming;
mod policies;
mod runtimes;
mod types;
pub mod visitor;

mod interlude {
    pub use std::sync::Arc;
    pub use std::sync::Weak;
    pub type Lazy<T> = std::sync::OnceLock<T>;
    pub use color_eyre::{eyre::eyre, Result};
}

use conv::ValueTypeKey;
use interlude::*;
use naming::DefaultNamingEngine;
use std::collections::HashMap;
pub use types::*;

#[derive(Debug)]
pub struct Typegraph {
    pub schema: Arc<tg_schema::Typegraph>,
    pub root: Arc<ObjectType>,
    pub input_types: HashMap<ValueTypeKey, Type>,
    pub output_types: HashMap<ValueTypeKey, Type>,
    pub functions: HashMap<u32, Arc<FunctionType>>,
    pub namespace_objects: HashMap<Vec<Arc<str>>, Arc<ObjectType>>,
    pub named: HashMap<Arc<str>, Type>,
}

impl From<Arc<tg_schema::Typegraph>> for Typegraph {
    fn from(schema: Arc<tg_schema::Typegraph>) -> Self {
        conv::Conversion::convert(schema, DefaultNamingEngine::default())
    }
}

impl Typegraph {
    pub fn root_functions(&self) -> RootFnsIter {
        RootFnsIter {
            stack: vec![Type::Object(Arc::clone(&self.root))],
        }
    }

    pub fn name(&self) -> &str {
        self.root.title()
    }
}

pub struct RootFnsIter {
    stack: Vec<Type>,
}

impl Iterator for RootFnsIter {
    // Item = Result<Arc<FunctionType>, Error>;
    type Item = Arc<FunctionType>;

    fn next(&mut self) -> Option<Self::Item> {
        let item = self.stack.pop()?;
        match item {
            Type::Object(object) => {
                self.stack
                    .extend(object.properties().values().map(|prop| prop.type_.clone()));
                self.next()
            }
            Type::Function(function) => Some(function),
            _ => unreachable!(), // TODO error
        }
    }
}
