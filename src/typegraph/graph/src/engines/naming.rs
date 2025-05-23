// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::expansion::ValueType;
use crate::interlude::*;
use crate::{Arc, FunctionType, ObjectType, Type, TypeNode as _};

#[derive(Default)]
pub struct NameRegistry {
    pub(crate) map: HashMap<Arc<str>, Type>,
}

impl NameRegistry {
    pub fn register(&mut self, name: String, ty: Type) -> Result<()> {
        let name: Arc<str> = name.into();
        ty.base()
            .name
            .set(name.clone())
            .map_err(|e| eyre!("name cannot be set more more than once: '{e}'"))?;
        if self.map.insert(name.clone(), ty).is_some() {
            bail!("failed to register duplicate name: '{}'", name);
        }
        Ok(())
    }
}

pub trait NamingEngineFactory: Clone {
    type Engine: NamingEngine;
    fn create(&self) -> Self::Engine;
}

pub trait NamingEngine {
    fn name_value_types<K: DupKey>(&mut self, types: &ValueType<K>) -> Result<()>;
    fn name_function(&mut self, function: &Arc<FunctionType>) -> Result<()>;
    fn name_ns_object(&mut self, ns_object: &Arc<ObjectType>) -> Result<()>;
    fn registry(&mut self) -> &mut NameRegistry;
}

mod default {
    use crate::{TypeNodeExt as _, Wrap as _};

    use super::*;

    #[derive(Default, Clone)]
    pub struct DefaultNamingEngineFactory;

    impl NamingEngineFactory for DefaultNamingEngineFactory {
        type Engine = DefaultNamingEngine;

        fn create(&self) -> Self::Engine {
            Self::Engine {
                reg: Default::default(),
            }
        }
    }

    pub struct DefaultNamingEngine {
        reg: NameRegistry,
    }

    impl NamingEngine for DefaultNamingEngine {
        fn name_value_types<K: DupKey>(&mut self, value_type: &ValueType<K>) -> Result<()> {
            if value_type.is_empty() {
                // the type has not been converted
                unreachable!("no registered type");
            }
            if let Some(item) = value_type.default.as_ref() {
                self.registry()
                    .register(item.title().to_owned(), item.clone())?;
            }
            for (idx, item) in value_type.variants.values().enumerate() {
                self.registry()
                    .register(format!("{}_{}", item.title(), idx + 1), item.clone())?;
            }
            Ok(())
        }

        fn name_function(&mut self, function: &Arc<FunctionType>) -> Result<()> {
            self.registry()
                .register(function.base().title.clone(), function.wrap())
        }

        fn name_ns_object(&mut self, ns_object: &Arc<ObjectType>) -> Result<()> {
            self.registry()
                .register(ns_object.base().title.clone(), ns_object.wrap())
        }

        fn registry(&mut self) -> &mut NameRegistry {
            &mut self.reg
        }
    }
}

pub use default::{DefaultNamingEngine, DefaultNamingEngineFactory};

use super::DupKey;
