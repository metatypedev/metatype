// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::core::StructConstraints;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::{Mutex, MutexGuard};

use crate::types::T;
use crate::{core, serialize::serialize_typegraph};

static TG: Lazy<Mutex<TypeGraph>> = Lazy::new(|| {
    Mutex::new(TypeGraph {
        // first item: placeholer for root type index
        types: vec![T::Struct(StructConstraints { props: vec![] })],
        exposed: HashMap::new(),
    })
});

pub fn tg() -> MutexGuard<'static, TypeGraph> {
    TG.lock().unwrap()
}

pub struct TypeGraph {
    pub(crate) types: Vec<T>,
    pub(crate) exposed: HashMap<String, core::Tpe>,
}

impl TypeGraph {
    pub fn get(&self, id: u32) -> &T {
        self.types
            .get(id as usize)
            .unwrap_or_else(|| panic!("type {} not found in {:?}", id, self.types))
    }
    pub fn add(&mut self, tpe: T) -> core::Tpe {
        let id = self.types.len() as u32;
        self.types.push(tpe);
        core::Tpe { id }
    }

    pub fn get_type_repr(&self, id: u32) -> String {
        self.get(id).get_repr(id)
    }

    pub fn expose(
        &mut self,
        fns: Vec<(String, u32)>,
        namespace: Vec<String>,
    ) -> Result<(), String> {
        if !namespace.is_empty() {
            return Err(String::from("namespaces not supported"));
        }
        for (name, tpe_id) in fns.into_iter() {
            let tpe = self.get(tpe_id);
            if !matches!(tpe, T::Func(_)) {
                return Err(format!(
                    "Expected a Func to be exposed at '{name}'; got {}",
                    tpe.get_repr(tpe_id)
                ));
            }
            if self.exposed.contains_key(&name) {
                return Err(format!(
                    "Another function is already exposed under the name '{name}'"
                ));
            }
            self.exposed.insert(name, core::Tpe { id: tpe_id });
        }
        Ok(())
    }

    pub(crate) fn root_type(&self) -> StructConstraints {
        StructConstraints {
            props: self
                .exposed
                .iter()
                .map(|(name, tpe)| (name.clone(), tpe.id))
                .collect(),
        }
    }

    pub fn serialize(&self) -> Result<String, String> {
        serialize_typegraph(self)
    }
}
