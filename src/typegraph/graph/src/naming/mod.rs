// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::{
    conv::{MapEntry, TypeKey},
    Arc, FunctionType, ObjectType, Type, TypeNode as _,
};

#[derive(Default)]
pub struct NameRegistry {
    pub(crate) map: HashMap<Arc<str>, Type>,
}

impl NameRegistry {
    pub fn register(&mut self, name: String, ty: Type) {
        let name: Arc<str> = name.into();
        ty.base().name.set(name.clone()).unwrap(); // TODO: error handling
        if self.map.insert(name.clone(), ty).is_some() {
            panic!("duplicate name: {}", name);
        }
    }
}

pub trait NamingEngine {
    fn name_value_types(&mut self, range: Vec<(TypeKey, &MapEntry)>);
    fn name_function(&mut self, function: &Arc<FunctionType>);
    fn name_ns_object(&mut self, ns_object: &Arc<ObjectType>);
    fn registry(&mut self) -> &mut NameRegistry;
}

mod default {
    use crate::{conv::TypeKey, TypeNodeExt as _, Wrap as _};

    use super::*;

    #[derive(Default)]
    pub struct DefaultNamingEngine {
        reg: NameRegistry,
    }

    impl NamingEngine for DefaultNamingEngine {
        fn name_value_types(&mut self, range: Vec<(TypeKey, &MapEntry)>) {
            match range.len() {
                0 => {}
                1 => {
                    let (_, e) = range.into_iter().next().unwrap();
                    self.registry()
                        .register(e.node.base().title.clone(), e.node.clone());
                }
                _ => {
                    for (key, e) in range {
                        self.registry()
                            .register(format!("{}_{}", e.node.title(), key.1), e.node.clone());
                    }
                }
            }
        }

        fn name_function(&mut self, function: &Arc<FunctionType>) {
            self.registry()
                .register(function.base().title.clone(), function.wrap());
        }

        fn name_ns_object(&mut self, ns_object: &Arc<ObjectType>) {
            self.registry()
                .register(ns_object.base().title.clone(), ns_object.wrap());
        }

        fn registry(&mut self) -> &mut NameRegistry {
            &mut self.reg
        }
    }
}

pub use default::DefaultNamingEngine;
