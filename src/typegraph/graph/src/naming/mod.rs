// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::{conv::ValueTypeKey, Arc, FunctionType, ObjectType, Type, TypeNode as _};

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
    fn name_value_types(
        &mut self,
        input: &HashMap<ValueTypeKey, Type>,
        output: &HashMap<ValueTypeKey, Type>,
    );
    fn name_function(&mut self, function: &Arc<FunctionType>);
    fn name_ns_object(&mut self, ns_object: &Arc<ObjectType>);
    fn registry(&mut self) -> &mut NameRegistry;
}

mod default {
    use std::collections::BTreeMap;

    use crate::{TypeNodeExt as _, Wrap as _};

    use super::*;

    #[derive(Default)]
    pub struct DefaultNamingEngine {
        reg: NameRegistry,
    }

    impl NamingEngine for DefaultNamingEngine {
        fn name_value_types(
            &mut self,
            input: &HashMap<ValueTypeKey, Type>,
            output: &HashMap<ValueTypeKey, Type>,
        ) {
            let in_map: BTreeMap<_, _> = input
                .iter()
                .map(|(k, v)| ((k.owner.upgrade().unwrap().idx(), &k.path), v.clone()))
                .collect();
            match in_map.len() {
                0 => {}
                1 => {
                    let ty = in_map.values().next().unwrap().clone();
                    self.registry().register(
                        format!("{}_in", ty.base().title),
                        in_map.values().next().unwrap().clone(),
                    );
                }
                _ => {
                    for (n, ty) in in_map.values().enumerate() {
                        self.registry()
                            .register(format!("{}_in{}", ty.base().title, n), ty.clone());
                    }
                }
            }

            let out_map: BTreeMap<_, _> = output
                .iter()
                .map(|(k, v)| ((k.owner.upgrade().unwrap().idx(), &k.path), v.clone()))
                .collect();
            match out_map.len() {
                0 => {}
                1 => {
                    let ty = out_map.values().next().unwrap().clone();
                    self.registry().register(
                        format!("{}_out", ty.base().title),
                        out_map.values().next().unwrap().clone(),
                    );
                }
                _ => {
                    for (n, ty) in out_map.values().enumerate() {
                        self.registry()
                            .register(format!("{}_out{}", ty.base().title, n), ty.clone());
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
