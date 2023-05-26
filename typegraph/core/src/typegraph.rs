// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::core::StructConstraints;
use indexmap::IndexMap;
use once_cell::sync::Lazy;
use std::sync::{Mutex, MutexGuard};

use crate::types::T;
use crate::{core, serialize::serialize_typegraph};

pub(crate) struct ActiveTypegraph {
    pub(crate) name: String,
    pub(crate) exposed: IndexMap<String, core::Tpe>,
}

#[derive(Default)]
pub(crate) struct Typegraph {
    pub types: Vec<T>,
    pub active_typegraph: Option<ActiveTypegraph>,
}

impl Typegraph {
    pub fn init_typegraph(&mut self, name: String) -> Result<(), String> {
        if let Some(tg) = &self.active_typegraph {
            return Err(format!(
                "Cannot init typegraph: typegraph context for '{}' is still active",
                tg.name,
            ));
        }
        self.active_typegraph = Some(ActiveTypegraph {
            name,
            exposed: IndexMap::new(),
        });

        Ok(())
    }

    pub fn finalize_typegraph(&mut self) -> Result<String, String> {
        if let Some(tg) = self.active_typegraph.take() {
            let root = self.add_type(T::Struct(tg.root_type()));
            serialize_typegraph(self, tg, root)
        } else {
            Err("Unexpected: no active typegraph context".to_string())
        }
    }

    pub fn get_type(&self, id: u32) -> &T {
        self.types
            .get(id as usize)
            .unwrap_or_else(|| panic!("type {} not found in {:?}", id, self.types))
    }
    pub fn add_type(&mut self, tpe: T) -> core::Tpe {
        let id = self.types.len() as u32;
        self.types.push(tpe);
        core::Tpe { id }
    }

    pub fn get_type_repr(&self, id: u32) -> String {
        self.get_type(id).get_repr(id)
    }

    pub fn active_typegraph(&self) -> Result<&ActiveTypegraph, String> {
        self.active_typegraph
            .as_ref()
            .ok_or_else(|| "No active typegraph context".to_string())
    }

    pub fn take_active_typegraph(&mut self) -> Result<ActiveTypegraph, String> {
        self.active_typegraph
            .take()
            .ok_or_else(|| "No active typegraph context".to_string())
    }

    pub fn expose(
        &mut self,
        fns: Vec<(String, u32)>,
        namespace: Vec<String>,
    ) -> Result<(), String> {
        let mut tg = self.take_active_typegraph()?;
        if !namespace.is_empty() {
            return Err(String::from("namespaces not supported"));
        }
        for (name, tpe_id) in fns.into_iter() {
            let tpe = self.get_type(tpe_id);
            if !matches!(tpe, T::Func(_)) {
                return Err(format!(
                    "Expected a Func to be exposed at '{name}'; got {}",
                    tpe.get_repr(tpe_id)
                ));
            }
            if tg.exposed.contains_key(&name) {
                return Err(format!(
                    "Another function is already exposed under the name '{name}'"
                ));
            }
            tg.exposed.insert(name, core::Tpe { id: tpe_id });
        }

        self.active_typegraph = Some(tg);
        Ok(())
    }
}

static TG: Lazy<Mutex<Typegraph>> = Lazy::new(|| Mutex::new(Typegraph::default()));

pub(crate) fn tg() -> MutexGuard<'static, Typegraph> {
    TG.lock().unwrap()
}

impl ActiveTypegraph {
    pub fn root_type(&self) -> StructConstraints {
        StructConstraints {
            props: self
                .exposed
                .iter()
                .map(|(name, tpe)| (name.clone(), tpe.id))
                .collect(),
        }
    }
}
