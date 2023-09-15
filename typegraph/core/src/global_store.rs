// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::{self, Result};
use crate::runtimes::{DenoMaterializer, Materializer, MaterializerDenoModule, Runtime};
use crate::types::{Type, TypeFun};
use crate::wit::core::{Error as TgError, Policy, PolicyId, RuntimeId, TypeId};
use crate::wit::runtimes::{Effect, MaterializerDenoPredefined, MaterializerId};
use std::{cell::RefCell, collections::HashMap};

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

pub fn with_store<T, F: FnOnce(&Store) -> T>(f: F) -> T {
    STORE.with(|s| f(&s.borrow()))
}

pub fn with_store_mut<T, F: FnOnce(&mut Store) -> T>(f: F) -> T {
    STORE.with(|s| f(&mut s.borrow_mut()))
}

#[cfg(test)]
impl Store {
    pub fn reset(&mut self) {
        let _ = crate::typegraph::finalize();
        *self = Store::new();
    }
}

impl Store {
    pub fn resolve_proxy(&self, type_id: TypeId) -> Result<TypeId, TgError> {
        match self.get_type(type_id)? {
            Type::Proxy(p) => self
                .get_type_by_name(&p.data.name)
                .ok_or_else(|| errors::unregistered_type_name(&p.data.name)),
            _ => Ok(type_id),
        }
    }

    // unwrap type id inside array, optional, or WithInjection
    pub fn resolve_wrapper(&self, type_id: TypeId) -> Result<TypeId, TgError> {
        let mut id = self.resolve_proxy(type_id)?;
        loop {
            let tpe = self.get_type(id)?;
            let new_id = match tpe {
                Type::Array(t) => t.data.of,
                Type::Optional(t) => t.data.of,
                Type::WithInjection(t) => t.data.tpe,
                Type::Proxy(t) => self.resolve_proxy(t.id)?,
                _ => id,
            };
            if id == new_id {
                break;
            }
            id = new_id;
        }
        Ok(id)
    }

    pub fn get_type(&self, type_id: TypeId) -> Result<&Type, TgError> {
        self.types
            .get(type_id as usize)
            .ok_or_else(|| errors::object_not_found("type", type_id))
    }

    pub fn get_type_by_path(
        &self,
        struct_id: TypeId,
        path: &[String],
    ) -> Result<(&Type, TypeId), TgError> {
        let mut ret = (self.get_type(struct_id)?, struct_id);

        let mut curr_path = vec![];
        for (pos, chunk) in path.iter().enumerate() {
            let unwrapped_id = self.resolve_wrapper(ret.1)?;
            match self.get_type(unwrapped_id)? {
                Type::Struct(t) => {
                    let result = t.data.props.iter().find(|(k, _)| k.eq(chunk));
                    curr_path.push(chunk.clone());
                    ret = match result {
                        Some((_, id)) => (self.get_type(*id)?, *id),
                        None => {
                            return Err(errors::invalid_path(
                                pos,
                                path,
                                &t.data
                                    .props
                                    .iter()
                                    .map(|v| format!("{:?}", v.0.clone()))
                                    .collect::<Vec<String>>(),
                            ));
                        }
                    };
                }
                _ => return Err(errors::expect_object_at_path(&curr_path)),
            }
        }

        Ok(ret)
    }

    pub fn get_type_mut(&mut self, type_id: TypeId) -> Result<&mut Type, TgError> {
        self.types
            .get_mut(type_id as usize)
            .ok_or_else(|| errors::object_not_found("type", type_id))
    }

    pub fn get_type_by_name(&self, name: &str) -> Option<TypeId> {
        self.type_by_names.get(name).copied()
    }

    pub fn add_type(&mut self, build: impl FnOnce(TypeId) -> Type) -> TypeId {
        let id = self.types.len() as u32;
        let tpe = build(id);
        if let Some(name) = tpe.get_base().and_then(|b| b.name.as_ref()) {
            self.type_by_names.insert(name.clone(), id);
        }
        self.types.push(tpe);
        id
    }

    pub fn get_type_repr(&self, id: TypeId) -> Result<String, TgError> {
        Ok(self.get_type(id)?.to_string())
    }

    pub fn register_runtime(&mut self, rt: Runtime) -> RuntimeId {
        let id = self.runtimes.len() as u32;
        self.runtimes.push(rt);
        id
    }

    pub fn get_runtime(&self, id: RuntimeId) -> Result<&Runtime> {
        self.runtimes
            .get(id as usize)
            .ok_or_else(|| errors::object_not_found("runtime", id))
    }

    pub fn get_deno_runtime(&self) -> RuntimeId {
        self.deno_runtime
    }

    pub fn register_materializer(&mut self, mat: Materializer) -> MaterializerId {
        let id = self.materializers.len() as u32;
        self.materializers.push(mat);
        id
    }

    pub fn get_materializer(&self, id: MaterializerId) -> Result<&Materializer> {
        self.materializers
            .get(id as usize)
            .ok_or_else(|| errors::object_not_found("materializer", id))
    }

    pub fn register_policy(&mut self, policy: Policy) -> Result<PolicyId> {
        let id = self.policies.len() as u32;
        if self.policies.iter().any(|p| p.name == policy.name) {
            Err(errors::duplicate_policy_name(&policy.name))
        } else {
            self.policies.push(policy);
            Ok(id)
        }
    }

    pub fn get_policy(&self, id: PolicyId) -> Result<&Policy> {
        self.policies
            .get(id as usize)
            .ok_or_else(|| errors::object_not_found("policy", id))
    }

    pub fn get_predefined_deno_function(&mut self, name: String) -> Result<MaterializerId> {
        if let Some(mat) = self.predefined_deno_functions.get(&name) {
            Ok(*mat)
        } else if PREDEFINED_DENO_FUNCTIONS.iter().any(|n| n == &name) {
            Err(errors::unknown_predefined_function(&name, "deno"))
        } else {
            let runtime_id = self.get_deno_runtime();
            let mat = self.register_materializer(Materializer {
                runtime_id,
                effect: Effect::None,
                data: DenoMaterializer::Predefined(MaterializerDenoPredefined {
                    name: name.clone(),
                })
                .into(),
            });
            self.predefined_deno_functions.insert(name, mat);
            Ok(mat)
        }
    }

    pub fn get_deno_module(&mut self, file: String) -> MaterializerId {
        if let Some(mat) = self.deno_modules.get(&file) {
            *mat
        } else {
            let runtime_id = self.get_deno_runtime();
            let mat = self.register_materializer(Materializer {
                runtime_id,
                effect: Effect::None, // N/A
                data: DenoMaterializer::Module(MaterializerDenoModule { file: file.clone() })
                    .into(),
            });
            self.deno_modules.insert(file, mat);
            mat
        }
    }
}
