// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::{ModelRef, PrismaContext};
use crate::runtimes::prisma::errors;
use crate::runtimes::prisma::model::{Property, RelationshipProperty};

use super::Cardinality;

#[derive(Debug, Clone)]
pub struct Candidate {
    pub source_model: ModelRef,
    pub field_name: String,
    pub property: RelationshipProperty,
    pub model: ModelRef,
}

impl PrismaContext {
    fn create_candidate(
        &self,
        source_model: ModelRef,
        prop_name: String,
        source_candidate: Option<&Candidate>,
    ) -> Result<Option<Candidate>> {
        let model = source_model.borrow();
        let prop = {
            let prop = model.get_prop(&prop_name).ok_or_else(|| {
                format!(
                    "Property {} not found on model {}",
                    prop_name, model.type_name
                )
            })?;
            let Property::Model(prop) = prop else {
                return Ok(None);
            };
            prop
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
            property: prop.clone(),
            model: target_model,
        }))
    }

    /// get potential targets for candidate
    fn get_potential_targets(&self, candidate: Candidate) -> Result<Vec<Candidate>> {
        let model = candidate.model.borrow();
        let mut candidates = model
            .iter_relationship_props()
            .filter_map(|(k, _prop)| {
                self.create_candidate(candidate.model.clone(), k.to_string(), Some(&candidate))
                    .transpose()
            })
            .collect::<Result<Vec<_>>>()?;

        let match_by_name = candidates
            .iter()
            .enumerate()
            .filter_map(|(i, c)| {
                match (
                    &c.property.relationship_attributes.name,
                    &candidate.property.relationship_attributes.name,
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
            _ => return Err("multiple matching relationships found".into()), // TODO
        }

        let match_by_target_field = candidates
            .iter()
            .enumerate()
            .filter(|(_i, c)| {
                c.property
                    .relationship_attributes
                    .target_field
                    .as_ref()
                    .map(|n| n == &candidate.field_name)
                    .unwrap_or(false)
                    || candidate
                        .property
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
            _ => return Err("multiple matching relationships found".into()), // TODO
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
                )
                .into())
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

#[derive(Debug, Clone)]
pub enum RelationshipName {
    User(String),
    Generated(String),
}

impl std::fmt::Display for RelationshipName {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        use RelationshipName::*;
        match self {
            User(name) => write!(f, "{}", name),
            Generated(name) => write!(f, "{}", name),
        }
    }
}

impl From<RelationshipName> for String {
    fn from(name: RelationshipName) -> Self {
        match name {
            RelationshipName::User(name) => name,
            RelationshipName::Generated(name) => name,
        }
    }
}

impl CandidatePair {
    pub fn rel_name(&self) -> Result<RelationshipName> {
        use RelationshipName::*;
        match (
            &self.0.property.relationship_attributes.name,
            &self.1.property.relationship_attributes.name,
        ) {
            (None, None) => Ok(Generated(format!(
                "rel_{}_{}",
                self.1.model.type_name(),
                self.0.model.type_name()
            ))),
            (Some(a), None) => Ok(User(a.clone())),
            (None, Some(b)) => Ok(User(b.clone())),
            (Some(a), Some(b)) => {
                if a == b {
                    Ok(User(a.clone()))
                } else {
                    // unreachable!
                    Err(format!("conflicting relationship names: {} and {}", a, b).into())
                }
            }
        }
    }

    pub fn ordered(self) -> Result<Self> {
        let CandidatePair(first, second) = self;
        // right will be the model that has the foreign key
        use Cardinality as C;
        match (first.property.quantifier, second.property.quantifier) {
            (C::One, C::One) | (C::Optional, C::Optional) => {
                let (first_attrs, second_attrs) = (&first.property.relationship_attributes, &second.property.relationship_attributes);
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
                        match (first.property.unique, second.property.unique) {
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
                ).into())
            }
        }
    }
}
