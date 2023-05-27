// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{
    collections::HashMap,
    sync::{Mutex, MutexGuard},
};

use once_cell::sync::Lazy;

use crate::{
    core::{Error as TgError, TypeId, TypeRef},
    errors::{self, Result},
    types::{TypeFun, T},
};

#[derive(Default)]
pub struct Store {
    pub types: Vec<T>,
    pub type_by_names: HashMap<String, TypeId>,
}

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
    pub fn resolve_ref(&self, type_ref: TypeRef) -> Result<TypeId, TgError> {
        match type_ref {
            TypeRef::Id(id) => Ok(id),
            TypeRef::Name(name) => self
                .type_by_names
                .get(&name)
                .copied()
                .ok_or_else(|| errors::unregistered_type_name(&name)),
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
        self.types.push(tpe);
        id
    }

    pub fn get_type_repr(&self, id: TypeId) -> Result<String, TgError> {
        Ok(self.get_type(id)?.get_repr(id))
    }
}
