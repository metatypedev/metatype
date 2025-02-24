// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{collections::HashMap, fmt::Write, sync::RwLock};
use typegraph::conv::TypeKey;

pub trait TypeSpec: Sized + std::fmt::Debug {
    fn render_definition(&self, out: &mut impl Write, map: &TypeGenMap<Self>) -> std::fmt::Result;
    fn rendered_name(&self, map: &TypeGenMap<Self>) -> String;
}

#[derive(Debug)]
pub struct TypeGenMap<S: TypeSpec> {
    map: HashMap<TypeKey, S>,
    name_memo: RwLock<HashMap<TypeKey, String>>,
}

impl<S: TypeSpec> TypeGenMap<S> {
    pub fn new(map: HashMap<TypeKey, S>) -> Self {
        Self {
            map,
            name_memo: RwLock::new(HashMap::new()),
        }
    }
    pub fn get_name(&self, key: TypeKey) -> Option<String> {
        let cached = self.name_memo.read().unwrap().get(&key).cloned();
        if let Some(cached) = cached {
            Some(cached)
        } else {
            let name = self.map.get(&key).map(|spec| spec.rendered_name(self));
            if let Some(name) = name {
                self.name_memo.write().unwrap().insert(key, name.clone());
                Some(name)
            } else {
                None
            }
        }
    }

    pub fn render_definition(&self, key: TypeKey, out: &mut impl Write) -> std::fmt::Result {
        if let Some(spec) = self.map.get(&key) {
            spec.render_definition(out, self)
        } else {
            eprintln!("no definition to render: {key:?}");
            // TODO error
            Ok(())
        }
    }

    pub fn contains_key(&self, key: TypeKey) -> bool {
        self.map.contains_key(&key)
    }

    pub fn render_all_types(&self, out: &mut impl Write) -> std::fmt::Result {
        for (_, spec) in &self.map {
            spec.render_definition(out, self)?;
        }
        Ok(())
    }
}
