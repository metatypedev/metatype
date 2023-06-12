// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{
    collections::HashMap,
    sync::{Mutex, MutexGuard},
};

use once_cell::sync::Lazy;

use crate::{
    errors::{self, Result},
    runtimes::{DenoMaterializer, Materializer, MaterializerDenoModule, Runtime},
    types::{TypeFun, T},
    wit::core::{Error as TgError, RuntimeId, TypeId},
    wit::runtimes::{Effect, MaterializerDenoPredefined, MaterializerId},
};

#[derive(Default)]
pub struct Store {
    pub types: Vec<T>,
    pub type_by_names: HashMap<String, TypeId>,

    pub runtimes: Vec<Runtime>,
    pub materializers: Vec<Materializer>,
    default_deno_runtime: Option<RuntimeId>,
    predefined_deno_functions: HashMap<String, MaterializerId>,
    deno_modules: HashMap<String, MaterializerId>,
}

const PREDEFINED_DENO_FUNCTIONS: &[&str] = &["identity"];

static STORE: Lazy<Mutex<Store>> = Lazy::new(|| Mutex::new(Store::default()));

pub fn store() -> MutexGuard<'static, Store> {
    STORE.lock().unwrap()
}

#[cfg(test)]
impl Store {
    pub fn reset(&mut self) {
        *self = Store::default();
        let _ = crate::typegraph::finalize();
    }
}

impl Store {
    pub fn resolve_proxy(&self, type_id: TypeId) -> Result<TypeId, TgError> {
        match self.get_type(type_id)? {
            T::Proxy(p) => self
                .type_by_names
                .get(&p.0.name)
                .copied()
                .ok_or_else(|| errors::unregistered_type_name(&p.0.name)),
            _ => Ok(type_id),
        }
    }

    // TODO: optional return
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

    pub fn register_materializer(&mut self, mat: Materializer) -> MaterializerId {
        let id = self.runtimes.len() as u32;
        self.materializers.push(mat);
        id
    }

    pub fn get_default_deno_runtime(&mut self) -> RuntimeId {
        match self.default_deno_runtime {
            Some(runtime) => runtime,
            None => {
                let runtime = self.register_runtime(Runtime::Deno);
                self.default_deno_runtime = Some(runtime);
                runtime
            }
        }
    }

    pub fn get_predefined_deno_function(&mut self, name: String) -> Result<MaterializerId> {
        if let Some(mat) = self.predefined_deno_functions.get(&name) {
            Ok(*mat)
        } else if PREDEFINED_DENO_FUNCTIONS.iter().any(|n| n == &name) {
            Err(errors::unknown_predefined_function(&name, "deno"))
        } else {
            let runtime_id = self.get_default_deno_runtime();
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
            let runtime_id = self.get_default_deno_runtime();
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
