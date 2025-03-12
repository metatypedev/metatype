// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::interlude::*;
use crate::{conv::MapValueItem, Arc, FunctionType, ObjectType, Type, TypeNode as _};

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

pub trait NamingEngine {
    fn name_value_types(&mut self, types: &[MapValueItem]) -> Result<()>;
    fn name_function(&mut self, function: &Arc<FunctionType>) -> Result<()>;
    fn name_ns_object(&mut self, ns_object: &Arc<ObjectType>) -> Result<()>;
    fn registry(&mut self) -> &mut NameRegistry;
}

mod default {
    use crate::{TypeNodeExt as _, Wrap as _};

    use super::*;

    #[derive(Default)]
    pub struct DefaultNamingEngine {
        reg: NameRegistry,
    }

    impl NamingEngine for DefaultNamingEngine {
        fn name_value_types(&mut self, range: &[MapValueItem]) -> Result<()> {
            match range.len() {
                0 => {
                    unreachable!("no registered type");
                }
                1 => {
                    let first = range.iter().next().unwrap();
                    self.registry()
                        .register(first.ty.title().to_owned(), first.ty.clone())?;
                }
                _ => {
                    for (idx, item) in range.iter().enumerate() {
                        self.registry()
                            .register(format!("{}_{}", item.ty.title(), idx), item.ty.clone())?;
                    }
                }
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

pub use default::DefaultNamingEngine;
