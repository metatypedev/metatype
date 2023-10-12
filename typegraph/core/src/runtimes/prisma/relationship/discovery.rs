// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::{ModelRef, PrismaContext};
use crate::runtimes::prisma::errors;
use crate::runtimes::prisma::utils::model::{RelationshipAttributes, RelationshipProperty};
use crate::types::TypeId;

use super::Cardinality;

#[derive(Debug, Clone)]
pub struct Candidate {
    pub source_model: ModelRef,
    pub field_name: String,
    pub wrapper_type: TypeId,
    // pub model_id: TypeId,
    pub model: ModelRef,
    pub cardinality: Cardinality,
    pub relationship_attributes: RelationshipAttributes,
    pub unique: bool,
}

impl PrismaContext {
    fn create_candidate(
        &self,
        source_model: ModelRef,
        prop_name: String,
        source_candidate: Option<&Candidate>,
    ) -> Result<Option<Candidate>> {
        let prop = {
            let model = source_model.borrow();
            let prop = model.get_prop(&prop_name).ok_or_else(|| {
                format!(
                    "Property {} not found on model {}",
                    prop_name, model.type_name
                )
            })?;
            match RelationshipProperty::try_from(prop.clone()) {
                Ok(prop) => prop,
                Err(_) => return Ok(None),
            }
        };

        if let Some(source_candidate) = source_candidate {
            if source_candidate.source_model.type_id() != prop.model_id {
                return Ok(None);
            }

            if source_candidate.model.type_id() == prop.model_id {
                // self reference
                if prop_name == source_candidate.field_name {
                    return Ok(None);
                }
            }
        }

        let target_model = self.model(prop.model_id)?;

        Ok(Some(Candidate {
            source_model: source_model.clone(),
            field_name: prop_name,
            wrapper_type: prop.wrapper_type_id,
            model: target_model,
            cardinality: prop.quantifier,
            relationship_attributes: prop.relationship_attributes,
            unique: prop.unique,
        }))
    }

    /// get potential targets for candidate
    fn get_potential_targets(&self, candidate: Candidate) -> Result<Vec<Candidate>> {
        eprintln!("> getting potential targets for candidate {candidate:#?}");
        let model = candidate.model.borrow();
        let mut candidates = model
            .iter_relationship_props()
            .filter_map(|(k, _prop)| {
                self.create_candidate(candidate.model.clone(), k.to_string(), Some(&candidate))
                    .transpose()
            })
            .collect::<Result<Vec<_>>>()?;

        eprintln!(
            "exhaustive candidates: {:?}",
            candidates.iter().map(|c| &c.field_name).collect::<Vec<_>>()
        );

        let match_by_name = candidates
            .iter()
            .enumerate()
            .filter_map(|(i, c)| {
                match (
                    &c.relationship_attributes.name,
                    &candidate.relationship_attributes.name,
                ) {
                    (Some(a), Some(b)) if a == b => Some(i),
                    _ => None,
                }
            })
            .collect::<Vec<_>>();

        match match_by_name.len() {
            0 => {}
            1 => {
                let i = match_by_name[0];
                return Ok(vec![candidates.swap_remove(i)]);
            }
            _ => return Err("multiple matching relationships found".to_string()), // TODO
        }

        let match_by_target_field = candidates
            .iter()
            .enumerate()
            .filter(|(_i, c)| {
                c.relationship_attributes
                    .target_field
                    .as_ref()
                    .map(|n| n == &candidate.field_name)
                    .unwrap_or(false)
                    || candidate
                        .relationship_attributes
                        .target_field
                        .as_ref()
                        .map(|n| n == &c.field_name)
                        .unwrap_or(false)
            })
            .map(|(i, _)| i)
            .collect::<Vec<_>>();

        match match_by_target_field.len() {
            0 => {}
            1 => {
                let i = match_by_target_field[0];
                return Ok(vec![candidates.swap_remove(i)]);
            }
            _ => return Err("multiple matching relationships found".to_string()), // TODO
        }

        Ok(candidates)
    }

    fn create_candidate_pair_from(&self, candidate: Candidate) -> Result<CandidatePair> {
        let alternatives = self.get_potential_targets(candidate.clone())?;
        match alternatives.len() {
            0 => Err(errors::no_relationship_target(
                &candidate.source_model.type_name(),
                &candidate.field_name,
                &candidate.model.type_name(),
            )),
            1 => Ok(CandidatePair(
                candidate,
                alternatives.into_iter().next().unwrap(),
            )),
            _ => {
                let details = alternatives
                    .into_iter()
                    .map(|c| format!("\n{:#?}", c))
                    .collect::<Vec<_>>()
                    .join("");
                Err(format!(
                    "multiple alternative targets found for {:?}: {}",
                    candidate, details
                ))
            }
        }
    }

    pub fn scan_model(&self, model: ModelRef) -> Result<Vec<CandidatePair>> {
        let candidates = model
            .borrow()
            .iter_relationship_props()
            .filter_map(|(k, _prop)| {
                self.create_candidate(model.clone(), k.to_string(), None)
                    .transpose()
            })
            .collect::<Result<Vec<_>>>()?;

        candidates
            .into_iter()
            .map(|c| self.create_candidate_pair_from(c))
            .collect::<Result<Vec<_>>>()
    }
}

#[derive(Debug)]
pub struct CandidatePair(pub Candidate, pub Candidate);

impl CandidatePair {
    pub fn rel_name(&self, id: usize) -> Result<String> {
        match (
            &self.0.relationship_attributes.name,
            &self.1.relationship_attributes.name,
        ) {
            (None, None) => Ok(format!(
                "__rel_{}_{}_{id}",
                self.1.model.type_name(),
                self.0.model.type_name()
            )),
            (Some(a), None) => Ok(a.clone()),
            (None, Some(b)) => Ok(b.clone()),
            (Some(a), Some(b)) => {
                if a == b {
                    Ok(a.clone())
                } else {
                    // unreachable!
                    Err(format!("conflicting relationship names: {} and {}", a, b))
                }
            }
        }
    }

    pub fn ordered(self) -> Result<Self> {
        let CandidatePair(first, second) = self;
        // right will be the model that has the foreign key
        use Cardinality as C;
        match (first.cardinality, second.cardinality) {
            (C::One, C::One) | (C::Optional, C::Optional) => {
                let (first_attrs, second_attrs) = (&first.relationship_attributes, &second.relationship_attributes);
                match (first_attrs.fkey, second_attrs.fkey) {
                    (Some(true), Some(false)) => Ok(Self(first, second)),
                    (Some(false), Some(true)) => Ok(Self(second, first)),
                    (Some(true), Some(true)) => {
                        Err(errors::conflicting_attributes("fkey", &first.model.type_name(), &second.field_name, &second.model.type_name(), &first.field_name))
                    }
                    (Some(false), Some(false)) => Err(errors::conflicting_attributes("fkey", &first.model.type_name(), &second.field_name, &second.model.type_name(), &first.field_name)),
                    (Some(true), None) => Ok(Self(first, second)),
                    (Some(false), None) => Ok(Self(second, first)),
                    (None, Some(true)) => Ok(Self(second, first)),
                    (None, Some(false)) => Ok(Self(first, second)),
                    (None, None) => {
                        // choose by unique attribute
                        match (first.unique, second.unique) {
                            (true, false) => Ok(Self(first, second)),
                            (false, true) => Ok(Self(second, first)),
                            (true, true) => Err(errors::conflicting_attributes("unique", &first.model.type_name(), &second.field_name, &second.model.type_name(), &first.field_name)),
                            (false, false) => Err(errors::ambiguous_side(&first.model.type_name(), &second.field_name, &second.model.type_name(), &first.field_name)),
                        }
                    }
                }
            }

            (C::One, C::Optional) | (C::One, C::Many) | (C::Optional, C::Many) => {
                // TODO check unique/fkey
                Ok(Self(first, second))
            }

            (C::Optional, C::One) | (C::Many, C::One) | (C::Many, C::Optional) => {
                // TODO check unique/fkey
                Ok(Self(second, first))
            }
            (C::Many, C::Many) => {
                Err(format!(
                    "many-to-many relationship not supported: use explicit join table between {} and {}",
                    first.model.type_name(), second.model.type_name()
                ))
            }
        }
    }
}
