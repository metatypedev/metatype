// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// use super::errors;
use crate::errors::Result;
use crate::global_store::with_store;
use crate::runtimes::prisma::type_utils::get_id_field;
use crate::types::TypeId;
#[cfg(test)]
use indexmap::IndexSet as HashSet;
#[cfg(test)]
use indexmap::{map::Entry, IndexMap as HashMap};
#[cfg(not(test))]
use std::collections::HashSet;
#[cfg(not(test))]
use std::collections::{hash_map::Entry, HashMap};

use std::cell::RefCell;

use super::{
    discovery::{scan_model, Candidate, CandidatePair},
    Relationship, RelationshipModel,
};

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
    complete_registrations: HashSet<TypeId>,
    counter: RefCell<usize>,
}

impl RelationshipRegistry {
    fn is_registered(&self, candidate: &Candidate) -> bool {
        let entry = self.models.get(&candidate.source_model);
        match entry {
            Some(entry) => entry.relationships.contains_key(&candidate.field_name),
            None => false,
        }
    }

    fn add_relationship_field(
        &mut self,
        candidate: &Candidate,
        field_name: String,
        rel_name: String,
    ) -> Result<()> {
        use Entry as E;
        let entry = match self.models.entry(candidate.model_type) {
            E::Vacant(e) => e.insert(RegisteredModel {
                relationships: HashMap::new(),
                name: candidate.model_name.clone(),
                id_field: get_id_field(candidate.model_type)?,
            }),
            E::Occupied(e) => e.into_mut(),
        };
        match entry.relationships.entry(field_name) {
            E::Vacant(e) => {
                e.insert(rel_name);
                Ok(())
            }
            E::Occupied(_e) => Err("cannot readd relationship".to_string()),
        }
    }

    fn register_pair(&mut self, pair: CandidatePair) -> Result<bool> {
        match (self.is_registered(&pair.0), self.is_registered(&pair.1)) {
            (true, true) => return Ok(false),
            (true, false) | (false, true) => {
                return Err(format!(
                    "Pair partially registered: pair={pair:?}, registry={:#?}",
                    self
                ))
            }
            (false, false) => {}
        }

        let id = self.next_id();
        let pair = pair.ordered()?;

        let rel_name = pair.rel_name(id)?;
        let CandidatePair(left, right) = pair;

        self.add_relationship_field(&left, right.field_name.clone(), rel_name.clone())?;
        self.add_relationship_field(&right, left.field_name.clone(), rel_name.clone())?;

        let relationship = Relationship {
            name: rel_name,
            left: RelationshipModel {
                model_type: left.model_type,
                model_name: left.model_name,
                wrapper_type: left.wrapper_type,
                field: right.field_name,
                cardinality: left.cardinality,
            },
            right: RelationshipModel {
                model_type: right.model_type,
                model_name: right.model_name,
                wrapper_type: right.wrapper_type,
                field: left.field_name,
                cardinality: right.cardinality,
            },
        };

        self.relationships
            .insert(relationship.name.clone(), relationship);

        Ok(true)
    }

    pub fn manage(&mut self, model_id: TypeId) -> Result<()> {
        if self.complete_registrations.contains(&model_id) {
            Ok(())
        } else {
            let related_models = with_store(|s| -> Result<_> {
                let mut related_models = vec![];

                let model = s.type_as_struct(model_id)?;

                if let Entry::Vacant(e) = self.models.entry(model_id) {
                    e.insert(RegisteredModel {
                        relationships: HashMap::new(),
                        name: model
                            .base
                            .name
                            .clone()
                            .ok_or_else(|| "prisma model requires a name".to_string())?,
                        id_field: get_id_field(model_id)?,
                    });
                }

                for pair in scan_model(model, self)?.into_iter() {
                    let related = pair.get_related(model_id)?;
                    if self.register_pair(pair)? {
                        if let Some(related) = related {
                            related_models.push(related);
                        }
                    }
                }

                Ok(related_models)
            })?;

            self.complete_registrations.insert(model_id);

            for related_model in related_models {
                self.manage(related_model)?;
            }

            Ok(())
        }
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

    pub fn next_id(&self) -> usize {
        let mut counter = self.counter.borrow_mut();
        // panic!("hum");
        eprintln!(">> counter: {}", *counter);
        *counter += 1;
        *counter
    }
}
