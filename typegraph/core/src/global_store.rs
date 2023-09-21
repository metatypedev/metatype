// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::{self, Result};
use crate::runtimes::{DenoMaterializer, Materializer, MaterializerDenoModule, Runtime};
use crate::types::{Struct, Type, TypeFun, TypeId, WrapperTypeData};
use crate::wit::core::{Policy as CorePolicy, PolicyId, RuntimeId};
use crate::wit::runtimes::{Effect, MaterializerDenoPredefined, MaterializerId};
use std::rc::Rc;
use std::{cell::RefCell, collections::HashMap};

pub type Policy = Rc<CorePolicy>;

#[derive(Default)]
pub struct Store {
    pub types: Vec<Type>,
    pub type_by_names: HashMap<String, TypeId>,

    pub runtimes: Vec<Runtime>,
    pub materializers: Vec<Materializer>,
    pub policies: Vec<Policy>,

    deno_runtime: RuntimeId,
    predefined_deno_functions: HashMap<String, MaterializerId>,
    deno_modules: HashMap<String, MaterializerId>,
}

impl Store {
    fn new() -> Self {
        Self {
            runtimes: vec![Runtime::Deno],
            deno_runtime: 0,
            ..Default::default()
        }
    }
}

const PREDEFINED_DENO_FUNCTIONS: &[&str] = &["identity"];

thread_local! {
    pub static STORE: RefCell<Store> = RefCell::new(Store::new());
}

fn with_store<T, F: FnOnce(&Store) -> T>(f: F) -> T {
    STORE.with(|s| f(&s.borrow()))
}

fn with_store_mut<T, F: FnOnce(&mut Store) -> T>(f: F) -> T {
    STORE.with(|s| f(&mut s.borrow_mut()))
}

#[cfg(test)]
impl Store {
    pub fn reset() {
        let _ = crate::typegraph::finalize();
        with_store_mut(|s| *s = Store::new());
    }
}

impl Store {
    pub fn get_type_by_name(name: &str) -> Option<TypeId> {
        with_store(|s| s.type_by_names.get(name).copied())
    }

    pub fn register_type(build: impl FnOnce(TypeId) -> Type) -> TypeId {
        // this works since the store is thread local
        let id = with_store(|s| s.types.len()) as u32;
        let typ = build(id.into());
        with_store_mut(|s| {
            if let Some(name) = typ.get_base().and_then(|b| b.name.as_ref()) {
                s.type_by_names.insert(name.clone(), id.into());
            }
            s.types.push(typ);
        });

        id.into()
    }

    pub fn register_runtime(rt: Runtime) -> RuntimeId {
        with_store_mut(|s| {
            let id = s.runtimes.len() as u32;
            s.runtimes.push(rt);
            id
        })
    }

    pub fn get_runtime(id: RuntimeId) -> Result<Runtime> {
        with_store(|s| {
            s.runtimes
                .get(id as usize)
                .cloned()
                .ok_or_else(|| errors::object_not_found("runtime", id))
        })
    }

    pub fn get_deno_runtime() -> RuntimeId {
        with_store(|s| s.deno_runtime)
    }

    pub fn register_materializer(mat: Materializer) -> MaterializerId {
        with_store_mut(|s| {
            let id = s.materializers.len() as u32;
            s.materializers.push(mat);
            id
        })
    }

    pub fn get_materializer(id: MaterializerId) -> Result<Materializer> {
        with_store(|s| {
            s.materializers
                .get(id as usize)
                .cloned()
                .ok_or_else(|| errors::object_not_found("materializer", id))
        })
    }

    pub fn register_policy(policy: Policy) -> Result<PolicyId> {
        with_store_mut(|s| {
            let id = s.policies.len() as u32;
            if s.policies.iter().any(|p| p.name == policy.name) {
                Err(errors::duplicate_policy_name(&policy.name))
            } else {
                s.policies.push(policy);
                Ok(id)
            }
        })
    }

    pub fn get_policy(id: PolicyId) -> Result<Policy> {
        with_store(|s| {
            s.policies
                .get(id as usize)
                .cloned()
                .ok_or_else(|| errors::object_not_found("policy", id))
        })
    }

    pub fn get_predefined_deno_function(name: String) -> Result<MaterializerId> {
        if let Some(mat) = with_store(|s| s.predefined_deno_functions.get(&name).cloned()) {
            Ok(mat)
        } else if PREDEFINED_DENO_FUNCTIONS.iter().any(|n| n == &name) {
            Err(errors::unknown_predefined_function(&name, "deno"))
        } else {
            let runtime_id = Store::get_deno_runtime();
            let mat = Store::register_materializer(Materializer {
                runtime_id,
                effect: Effect::None,
                data: Rc::new(DenoMaterializer::Predefined(MaterializerDenoPredefined {
                    name: name.clone(),
                }))
                .into(),
            });
            with_store_mut(|s| {
                s.predefined_deno_functions.insert(name, mat);
            });
            Ok(mat)
        }
    }

    pub fn get_deno_module(file: String) -> MaterializerId {
        if let Some(mat) = with_store(|s| s.deno_modules.get(&file).cloned()) {
            mat
        } else {
            let runtime_id = Store::get_deno_runtime();
            let mat = Store::register_materializer(Materializer {
                runtime_id,
                effect: Effect::None, // N/A
                data: Rc::new(DenoMaterializer::Module(MaterializerDenoModule {
                    file: file.clone(),
                }))
                .into(),
            });
            with_store_mut(|s| s.deno_modules.insert(file, mat));
            mat
        }
    }
}

impl TypeId {
    pub fn as_type(&self) -> Result<Type> {
        with_store(|s| {
            s.types
                .get(self.0 as usize)
                .cloned()
                .ok_or_else(|| errors::object_not_found("type", self.0))
        })
    }

    pub fn as_struct(&self) -> Result<Rc<Struct>> {
        match self.as_type()? {
            Type::Struct(s) => Ok(s),
            Type::Proxy(inner) => inner.data.try_resolve()?.as_struct(),
            _ => Err(errors::invalid_type("Struct", &self.repr()?)),
        }
    }

    pub fn is_func(&self) -> Result<bool> {
        Ok(matches!(self.as_type()?, Type::Func(_)))
    }

    pub fn resolve_quant(&self) -> Result<TypeId> {
        let type_id = *self;
        match type_id.as_type()? {
            Type::Array(a) => Ok(a.data.of.into()),
            Type::Optional(o) => Ok(o.data.of.into()),
            _ => Ok(type_id),
        }
    }
}
