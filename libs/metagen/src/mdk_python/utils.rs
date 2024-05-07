// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use indexmap::IndexMap;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct TypeGenerated {
    /// Type representation: int, str, class name, ..
    pub hint: String,
    /// Source-code (for structs only)
    pub def: Option<String>,
}

impl From<String> for TypeGenerated {
    fn from(value: String) -> Self {
        Self {
            hint: value.to_string(),
            def: None,
        }
    }
}

#[derive(Debug, Clone)]
struct Class {
    priority: u32,
    type_generated: Option<TypeGenerated>,
}

pub struct Memo {
    map: IndexMap<String, Class>,
    priority_weight: u32,
}

impl Memo {
    pub fn new() -> Self {
        Self {
            map: IndexMap::new(),
            priority_weight: 1,
        }
    }

    /// Insert `v` at `k`, if already present, this will also increase the priority by the current weight
    pub fn insert(&mut self, k: String, v: TypeGenerated) {
        if self.is_allocated(&k) {
            let old = self.map.get(&k).unwrap();
            self.map.insert(
                k,
                Class {
                    priority: old.priority + self.priority_weight,
                    type_generated: Some(v),
                },
            );
        }
    }

    /// Allocate for `k` and set priority to 0, if a place is already allocated this will do nothing
    pub fn allocate(&mut self, k: String) {
        if !self.is_allocated(&k) {
            self.map.insert(
                k,
                Class {
                    priority: 0,
                    type_generated: None,
                },
            );
        }
    }

    pub fn is_allocated(&self, k: &str) -> bool {
        self.map.contains_key(k)
    }

    pub fn types_in_order(&self) -> Vec<TypeGenerated> {
        let mut values = self
            .map
            .values()
            .filter(|c| c.type_generated.is_some())
            .collect::<Vec<_>>();

        // if typing dataclass A depends on dataclass B, then B must be generated first
        values.sort_by(|a, b| b.priority.cmp(&a.priority));

        values
            .iter()
            .filter_map(|c| c.type_generated.as_ref().cloned())
            .collect()
    }

    pub fn incr_weight(&mut self) {
        self.priority_weight += 1;
    }

    pub fn decr_weight(&mut self) {
        if let Some(value) = self.priority_weight.checked_sub(1) {
            self.priority_weight = value;
        } else {
            panic!("invalid state: priority weight overflowed")
        }
    }
}
