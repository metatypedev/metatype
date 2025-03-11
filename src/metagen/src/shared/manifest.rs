// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use indexmap::IndexMap;
use std::{collections::HashMap, fmt::Write, sync::RwLock};
use typegraph::conv::TypeKey;

use super::types::NameMemo;

pub trait TypeRenderer: Sized + std::fmt::Debug {
    fn render(
        &self,
        out: &mut impl Write,
        page: &ManifestPage<Self>,
        memo: &impl NameMemo,
    ) -> std::fmt::Result;
    /// get reference expression for the generated type;
    /// it is either a type name or a more complex expression if there type is not explicitly
    /// rendered
    fn get_reference_expr(&self, page: &ManifestPage<Self>, memo: &impl NameMemo)
        -> Option<String>;
}

impl NameMemo for HashMap<TypeKey, String> {
    fn get(&self, key: TypeKey) -> Option<&str> {
        self.get(&key).map(|s| s.as_str())
    }
}

#[derive(Debug)]
pub struct ManifestPage<R: TypeRenderer> {
    // pub map: HashMap<TypeKey, R>,
    pub map: IndexMap<TypeKey, R>,
    pub reference_cache: RwLock<HashMap<TypeKey, Option<String>>>,
}

impl<S: TypeRenderer> From<IndexMap<TypeKey, S>> for ManifestPage<S> {
    fn from(map: IndexMap<TypeKey, S>) -> Self {
        Self {
            map,
            reference_cache: RwLock::new(HashMap::new()),
        }
    }
}

impl<R: TypeRenderer> ManifestPage<R> {
    pub fn contains_key(&self, key: TypeKey) -> bool {
        self.map.contains_key(&key)
    }

    pub fn cache_references(&self, memo: &impl NameMemo) {
        for key in self.map.keys() {
            let _ = self.get_ref(key, memo);
        }
    }

    pub fn get_ref(&self, key: &TypeKey, memo: &impl NameMemo) -> Option<String> {
        {
            let cache = self.reference_cache.read().unwrap();
            if let Some(name) = cache.get(key) {
                return name.clone();
            }
        }

        let renderer = self.map.get(key)?;
        let name = renderer.get_reference_expr(self, memo);
        self.reference_cache
            .write()
            .unwrap()
            .insert(key.clone(), name.clone());
        name
    }

    pub fn render_all(&self, out: &mut impl Write, name_memo: &impl NameMemo) -> std::fmt::Result {
        for (k, spec) in &self.map {
            spec.render(out, self, name_memo)?;
        }
        Ok(())
    }

    pub fn take_refs(self) -> HashMap<TypeKey, Option<String>> {
        self.reference_cache.into_inner().unwrap()
    }
}

impl NameMemo for HashMap<TypeKey, Option<String>> {
    fn get(&self, key: TypeKey) -> Option<&str> {
        self.get(&key).and_then(|s| s.as_deref())
    }
}
