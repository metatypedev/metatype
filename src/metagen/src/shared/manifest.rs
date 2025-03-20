// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;
use indexmap::IndexMap;
use std::{collections::HashMap, fmt::Write, sync::RwLock};

use super::types::NameMemo;

pub trait TypeRenderer: Sized + std::fmt::Debug {
    type Context;

    fn render(
        &self,
        out: &mut impl Write,
        page: &ManifestPage<Self>,
        ctx: &Self::Context,
    ) -> std::fmt::Result;
    /// get reference expression for the generated type;
    /// it is either a type name or a more complex expression if there type is not explicitly
    /// rendered
    fn get_reference_expr(&self, page: &ManifestPage<Self>, ctx: &Self::Context) -> Option<String>;
}

impl NameMemo for HashMap<TypeKey, String> {
    fn get(&self, key: TypeKey) -> Option<&str> {
        self.get(&key).map(|s| s.as_str())
    }
}

impl NameMemo for IndexMap<TypeKey, String> {
    fn get(&self, key: TypeKey) -> Option<&str> {
        self.get(&key).map(|s| s.as_str())
    }
}

#[derive(Debug)]
pub struct ManifestPage<R: TypeRenderer, K: std::hash::Hash = TypeKey> {
    pub map: IndexMap<K, R>,
    pub reference_cache: RwLock<IndexMap<K, Option<String>>>,
}

impl<S: TypeRenderer> From<IndexMap<TypeKey, S>> for ManifestPage<S> {
    fn from(map: IndexMap<TypeKey, S>) -> Self {
        Self {
            map,
            reference_cache: RwLock::new(IndexMap::new()),
        }
    }
}

impl<R: TypeRenderer> ManifestPage<R> {
    pub fn contains_key(&self, key: TypeKey) -> bool {
        self.map.contains_key(&key)
    }

    pub fn cache_references(&self, ctx: &R::Context) {
        for key in self.map.keys() {
            let _ = self.get_ref(key, ctx);
        }
    }

    pub fn get_ref(&self, key: &TypeKey, ctx: &R::Context) -> Option<String> {
        {
            let cache = self.reference_cache.read().unwrap();
            if let Some(name) = cache.get(key) {
                return name.clone();
            }
        }

        let renderer = self.map.get(key)?;
        let name = renderer.get_reference_expr(self, ctx);
        self.reference_cache
            .write()
            .unwrap()
            .insert(key.clone(), name.clone());
        name
    }

    pub fn render_all(&self, out: &mut impl Write, ctx: &R::Context) -> std::fmt::Result {
        for (_k, spec) in &self.map {
            spec.render(out, self, ctx)?;
        }
        Ok(())
    }

    pub fn render_all_buffered(&self, ctx: &R::Context) -> Result<String, std::fmt::Error> {
        let mut buf = String::new();
        self.render_all(&mut buf, ctx)?;
        Ok(buf)
    }

    pub fn get_cached_refs(&self) -> IndexMap<TypeKey, String> {
        self.reference_cache
            .read()
            .unwrap()
            .iter()
            .filter_map(|(k, v)| v.clone().map(|v| (k.clone(), v)))
            .collect()
    }
}

impl NameMemo for HashMap<TypeKey, Option<String>> {
    fn get(&self, key: TypeKey) -> Option<&str> {
        self.get(&key).and_then(|s| s.as_deref())
    }
}
