// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// use super::errors;
use crate::{errors::Result, types::Struct, wit::core::TypeId};
#[cfg(test)]
use indexmap::{map::Entry, IndexMap as HashMap};
#[cfg(not(test))]
use std::collections::{hash_map::Entry, HashMap};

use super::{discovery::scan_model, Relationship};

#[derive(Default, Debug)]
pub struct RelationshipRegistry {
    // type_id => [ property => relationship ]
    models: HashMap<TypeId, HashMap<String, String>>,

    // relationship_name => relationship
    relationships: HashMap<String, Relationship>,
    // model_ids: HashMap<String, TypeId>,
}

impl RelationshipRegistry {
    pub fn from(models: &[&Struct]) -> Result<Self> {
        let mut reg = RelationshipRegistry::default();
        for model in models {
            let scanned = scan_model(model, &reg)?;
            reg.add_relationships(scanned);
        }
        Ok(reg)
    }

    fn add_relationships(&mut self, relationships: Vec<Relationship>) {
        for rel in relationships {
            let rel_name = rel.name.clone();
            match self.models.entry(rel.left.model_type) {
                Entry::Occupied(mut entry) => {
                    entry
                        .get_mut()
                        .insert(rel.left.field.clone(), rel_name.clone());
                }
                Entry::Vacant(entry) => {
                    let mut map = HashMap::new();
                    map.insert(rel.left.field.clone(), rel_name.clone());
                    entry.insert(map);
                }
            }

            match self.models.entry(rel.right.model_type) {
                Entry::Occupied(mut entry) => {
                    entry
                        .get_mut()
                        .insert(rel.right.field.clone(), rel_name.clone());
                }
                Entry::Vacant(entry) => {
                    let mut map = HashMap::new();
                    map.insert(rel.right.field.clone(), rel_name.clone());
                    entry.insert(map);
                }
            }

            self.relationships.insert(rel_name, rel);
        }
    }

    pub fn has(&self, model: TypeId, prop: &str) -> bool {
        self.models
            .get(&model)
            .map_or(false, |props| props.contains_key(prop))
    }
}
