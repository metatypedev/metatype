// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::{self, Result},
    runtimes::{DenoMaterializer, Materializer, MaterializerDenoModule, Runtime},
    types::{TypeFun, T},
    wit::core::{Error as TgError, RuntimeId, TypeId},
    wit::runtimes::{Effect, MaterializerDenoPredefined, MaterializerId},
};
use std::{cell::RefCell, collections::HashMap};

#[derive(Default)]
pub struct Store {
    pub types: Vec<T>,
    pub type_by_names: HashMap<String, TypeId>,

    pub runtimes: Vec<Runtime>,
    pub materializers: Vec<Materializer>,
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
            T::Proxy(p) => self
                .type_by_names
                .get(&p.data.name)
                .copied()
                .ok_or_else(|| errors::unregistered_type_name(&p.data.name)),
            _ => Ok(type_id),
        }
    }

    pub fn get_type(&self, type_id: TypeId) -> Result<&T, TgError> {
        self.types
            .get(type_id as usize)
            .ok_or_else(|| errors::type_not_found(type_id))
    }

    pub fn add_type(&mut self, tpe: T) -> TypeId {
        let id = self.types.len() as u32;
        if let Some(name) = tpe.get_base().and_then(|b| b.name.as_ref()) {
            self.type_by_names.insert(name.clone(), id);
        }
        self.types.push(tpe);
        id
    }

    pub fn get_type_repr(&self, id: TypeId) -> Result<String, TgError> {
        Ok(self.get_type(id)?.get_repr(id))
    }

    pub fn register_runtime(&mut self, rt: Runtime) -> RuntimeId {
        let id = self.runtimes.len() as u32;
        self.runtimes.push(rt);
        id
    }

    pub fn get_runtime(&self, id: RuntimeId) -> Result<&Runtime> {
        self.runtimes
            .get(id as usize)
            .ok_or_else(|| errors::runtime_not_found(id))
    }

    pub fn get_deno_runtime(&self) -> RuntimeId {
        self.deno_runtime
    }

    pub fn register_materializer(&mut self, mat: Materializer) -> MaterializerId {
        let id = self.materializers.len() as u32;
        self.materializers.push(mat);
        id
    }

    pub fn get_materializer(&self, id: MaterializerId) -> Result<&Materializer, TgError> {
        self.materializers
            .get(id as usize)
            .ok_or_else(|| errors::materializer_not_found(id))
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
