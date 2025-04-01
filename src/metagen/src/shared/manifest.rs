// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

//! Code generations are specified in a pre-computed manifest.
//! Each manifest is a collection of one or more manifest pages.
//! Each manifest page is a collection of manifest entries.

use crate::interlude::*;
use indexmap::IndexMap;
use std::{fmt::Write, sync::RwLock};

pub trait ManifestEntry: Sized + std::fmt::Debug {
    type Extras;
    fn render(
        &self,
        out: &mut impl Write,
        page: &ManifestPage<Self, Self::Extras>,
    ) -> std::fmt::Result;
    /// Get reference expression for the generated entity for this manifest entry;
    /// The reference is either a simple identifier or a more complex expression
    /// when the entity has not been specifically named.
    fn get_reference_expr(&self, page: &ManifestPage<Self, Self::Extras>) -> Option<String>;
}

#[derive(Debug)]
pub struct ManifestPage<R, E = ()>
where
    R: ManifestEntry<Extras = E>,
{
    pub map: IndexMap<TypeKey, R>,
    pub reference_cache: RwLock<IndexMap<TypeKey, Option<String>>>,
    pub extras: E,
}

impl<S, E> From<IndexMap<TypeKey, S>> for ManifestPage<S, E>
where
    S: ManifestEntry<Extras = E>,
    E: Default,
{
    fn from(map: IndexMap<TypeKey, S>) -> Self {
        Self {
            map,
            reference_cache: RwLock::new(IndexMap::new()),
            extras: Default::default(),
        }
    }
}

impl<R, E> ManifestPage<R, E>
where
    R: ManifestEntry<Extras = E>,
{
    pub fn with_extras(map: IndexMap<TypeKey, R>, extras: E) -> Self {
        Self {
            map,
            reference_cache: RwLock::new(IndexMap::new()),
            extras,
        }
    }

    pub fn contains_key(&self, key: TypeKey) -> bool {
        self.map.contains_key(&key)
    }

    pub fn cache_references(&self) {
        for key in self.map.keys() {
            let _ = self.get_ref(key);
        }
    }

    pub fn get_ref(&self, key: &TypeKey) -> Option<String> {
        {
            let cache = self.reference_cache.read().unwrap();
            if let Some(name) = cache.get(key) {
                return name.clone();
            }
        }

        let renderer = self.map.get(key)?;
        let name = renderer.get_reference_expr(self);
        self.reference_cache
            .write()
            .unwrap()
            .insert(*key, name.clone());
        name
    }

    pub fn render_all(&self, out: &mut impl Write) -> std::fmt::Result {
        for (_k, spec) in &self.map {
            spec.render(out, self)?;
        }
        Ok(())
    }

    pub fn render_all_buffered(&self) -> Result<String, std::fmt::Error> {
        let mut buf = String::new();
        self.render_all(&mut buf)?;
        Ok(buf)
    }

    pub fn get_cached_refs(&self) -> IndexMap<TypeKey, String> {
        self.reference_cache
            .read()
            .unwrap()
            .iter()
            .filter_map(|(k, v)| v.clone().map(|v| (*k, v)))
            .collect()
    }
}
