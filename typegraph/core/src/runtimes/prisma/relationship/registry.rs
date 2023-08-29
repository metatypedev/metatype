// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// use super::errors;
use crate::{
    errors::Result,
    global_store::with_store,
    runtimes::prisma::type_utils::get_id_field,
    types::{Struct, TypeId},
};
#[cfg(test)]
use indexmap::{map::Entry, IndexMap as HashMap};
#[cfg(not(test))]
use std::collections::{hash_map::Entry, HashMap};

use super::{discovery::scan_model, Relationship};

#[derive(Debug)]
pub struct RegisteredModel {
    // property => relationship_name
    pub relationships: HashMap<String, String>,
    pub name: String,
    pub id_field: String, // TODO support multiple id fields
}

#[derive(Default, Debug)]
pub struct RelationshipRegistry {
    pub models: HashMap<TypeId, RegisteredModel>,
    pub models_by_name: HashMap<String, TypeId>,
    // relationship_name => relationship
    pub relationships: HashMap<String, Relationship>,
}

impl RelationshipRegistry {
    pub fn manage(&mut self, model_id: TypeId) -> Result<()> {
        if !self.models.contains_key(&model_id) {
            with_store(|s| -> Result<()> {
                let model = s.type_as_struct(model_id)?;
                let relationships = scan_model(model, self)?;
                self.add_relationships(relationships)?;
                Ok(())
            })
        } else {
            Ok(())
        }
    }

    fn add_relationships(&mut self, relationships: Vec<Relationship>) -> Result<()> {
        for rel in relationships {
            let rel_name = rel.name.clone();
            match self.models.entry(rel.left.model_type) {
                Entry::Occupied(mut entry) => {
                    entry
                        .get_mut()
                        .relationships
                        .insert(rel.left.field.clone(), rel_name.clone());
                }
                Entry::Vacant(entry) => {
                    let mut val = RegisteredModel {
                        relationships: HashMap::new(),
                        name: rel.left.model_name.clone(),
                        id_field: get_id_field(*entry.key())?,
                    };
                    val.relationships
                        .insert(rel.left.field.clone(), rel_name.clone());
                    entry.insert(val);
                }
            }

            match self.models.entry(rel.right.model_type) {
                Entry::Occupied(mut entry) => {
                    entry
                        .get_mut()
                        .relationships
                        .insert(rel.right.field.clone(), rel_name.clone());
                }
                Entry::Vacant(entry) => {
                    let mut val = RegisteredModel {
                        relationships: HashMap::new(),
                        name: rel.right.model_name.clone(),
                        id_field: get_id_field(*entry.key())?,
                    };
                    val.relationships
                        .insert(rel.right.field.clone(), rel_name.clone());
                    entry.insert(val);
                }
            }

            self.relationships.insert(rel_name, rel);
        }

        Ok(())
    }

    pub fn has(&self, model: TypeId, prop: &str) -> bool {
        self.models
            .get(&model)
            .map_or(false, |entry| entry.relationships.contains_key(prop))
    }

    pub fn find_relationship_on(&self, model: TypeId, field: &str) -> Option<&Relationship> {
        self.models
            .get(&model)
            .unwrap()
            .relationships
            .get(field)
            .map(|n| self.relationships.get(n).unwrap())
    }
}
