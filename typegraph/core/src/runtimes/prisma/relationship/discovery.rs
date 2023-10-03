// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::runtimes::prisma::errors;
use crate::runtimes::prisma::type_utils::as_relationship_target;
use crate::types::{TypeFun, TypeId};
use crate::{errors::Result, types::Struct};

use super::Cardinality;
use super::RelationshipRegistry;

#[derive(Debug)]
pub struct Candidate {
    pub source_model: TypeId,
    pub source_model_name: String,
    pub field_name: String,
    pub wrapper_type: TypeId,
    pub model_type: TypeId,
    pub model_name: String,
    pub cardinality: Cardinality,
    fkey: Option<bool>,
    unique: bool,
    relationship_name: Option<String>,
    target_field: Option<String>,
}

impl Candidate {
    fn new(
        source_model: TypeId,
        field: String,
        type_id: TypeId,
        source_candidate: Option<&Candidate>,
    ) -> Result<Option<Candidate>> {
        let attrs = type_id.attrs()?;

        as_relationship_target(attrs.concrete_type, None)?
            .map(|(target_type, cardinality)| -> Result<_> {
                if let Some(source_candidate) = source_candidate {
                    if source_candidate.source_model != target_type {
                        return Ok(None);
                    }
                    if source_candidate.model_type == target_type {
                        // self reference
                        if field == source_candidate.field_name {
                            return Ok(None);
                        }
                    }
                }

                let source_model_name = source_model
                    .type_name()?
                    .ok_or_else(|| String::from("model must have name"))?;

                let model_name = target_type
                    .type_name()?
                    .ok_or_else(|| String::from("model must have name"))?;

                let fkey = attrs
                    .proxy_data
                    .iter()
                    .find_map(|(k, v)| {
                        (k == "fkey").then(|| {
                            serde_json::from_str::<bool>(v).map_err(|_| {
                                format!("invalid 'fkey' field: expected bool, got {}", v)
                            })
                        })
                    })
                    .transpose()?;

                let target_field = attrs
                    .proxy_data
                    .iter()
                    .find_map(|(k, v)| (k == "target_field").then(|| v.clone()));

                let unique = attrs.is_unique_ref()?;
                let relationship_name = attrs
                    .proxy_data
                    .iter()
                    .find_map(|(k, v)| (k == "rel_name").then(|| v.clone()));

                Ok(Some(Candidate {
                    source_model,
                    source_model_name,
                    field_name: field,
                    wrapper_type: type_id,
                    model_type: target_type,
                    model_name,
                    cardinality,
                    fkey,
                    unique,
                    relationship_name,
                    target_field,
                }))
            })
            .transpose()
            .map(|r| r.flatten())
    }

    fn into_pair(self, registry: &RelationshipRegistry) -> Result<CandidatePair> {
        let alternatives = self.get_alternatives(registry)?;
        match alternatives.len() {
            0 => Err(errors::no_relationship_target(
                &self.source_model_name,
                &self.field_name,
                &self.model_name,
            )),
            1 => {
                let target = alternatives.into_iter().next().unwrap();
                Ok(CandidatePair(self, target))
            }
            _ => {
                let details = alternatives
                    .into_iter()
                    .map(|c| format!("\n{:#?}", c))
                    .collect::<Vec<_>>()
                    .join("");
                Err(format!(
                    "multiple alternative targets found for {:?}:{details}",
                    self
                )
                .into())
            }
        }
    }

    /// get potential targets for this candidate
    fn get_alternatives(&self, registry: &RelationshipRegistry) -> Result<Vec<Candidate>> {
        let candidates = self
            .model_type
            .as_struct()?
            .iter_props()
            .filter_map(|(k, ty)| {
                Candidate::new(self.model_type, k.to_string(), ty, Some(self))
                    .map(|maybe_candidate| {
                        maybe_candidate.filter(|c| !registry.has(c.model_type, &c.field_name))
                    })
                    .transpose()
            })
            .collect::<Result<Vec<_>>>()?;

        // match by relationship name
        let matched = candidates
            .iter()
            .enumerate()
            .find(
                |(_, c)| match (&c.relationship_name, &self.relationship_name) {
                    (Some(a), Some(b)) => a == b,
                    _ => false,
                },
            )
            .map(|(i, _)| i);
        if let Some(i) = matched {
            let mut candidates = candidates;
            return Ok(vec![candidates.swap_remove(i)]);
        }

        // match by target field
        let matched = candidates
            .iter()
            .enumerate()
            .find(|(_, c)| {
                c.target_field
                    .as_ref()
                    .map(|f| f == &self.field_name)
                    .unwrap_or(false)
                    || self
                        .target_field
                        .as_ref()
                        .map(|f| f == &c.field_name)
                        .unwrap_or(false)
            })
            .map(|(i, _)| i);
        if let Some(i) = matched {
            let mut candidates = candidates;
            return Ok(vec![candidates.swap_remove(i)]);
        }

        Ok(candidates)
    }
}

#[derive(Debug)]
pub struct CandidatePair(pub Candidate, pub Candidate);

impl CandidatePair {
    pub fn rel_name(&self, id: usize) -> Result<String> {
        match (&self.0.relationship_name, &self.1.relationship_name) {
            (None, None) => Ok(format!(
                "__rel_{}_{}_{id}",
                self.1.model_name, self.0.model_name
            )),
            (Some(a), None) => Ok(a.clone()),
            (None, Some(b)) => Ok(b.clone()),
            (Some(a), Some(b)) => {
                if a == b {
                    Ok(a.clone())
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
        match (first.cardinality, second.cardinality) {
            (C::One, C::One) | (C::Optional, C::Optional) => {
                match (first.fkey, second.fkey) {
                    (Some(true), Some(false)) => Ok(Self(first, second)),
                    (Some(false), Some(true)) => Ok(Self(second, first)),
                    (Some(true), Some(true)) => {
                        Err(errors::conflicting_attributes("fkey", &first.model_name, &second.field_name, &second.model_name, &first.field_name))
                    }
                    (Some(false), Some(false)) => Err(errors::conflicting_attributes("fkey", &first.model_name, &second.field_name, &second.model_name, &first.field_name)),
                    (Some(true), None) => Ok(Self(first, second)),
                    (Some(false), None) => Ok(Self(second, first)),
                    (None, Some(true)) => Ok(Self(second, first)),
                    (None, Some(false)) => Ok(Self(first, second)),
                    (None, None) => {
                        // choose by unique attribute
                        match (first.unique, second.unique) {
                            (true, false) => Ok(Self(first, second)),
                            (false, true) => Ok(Self(second, first)),
                            (true, true) => Err(errors::conflicting_attributes("unique", &first.model_name, &second.field_name, &second.model_name, &first.field_name)),
                            (false, false) => Err(errors::ambiguous_side(&first.model_name, &second.field_name, &second.model_name, &first.field_name)),
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
                    first.model_name, second.model_name
                ).into())
            }
        }
    }

    /// get the model related to the given one in this pair.
    /// Returns an error if the given model is not in this pair.
    /// Returns None if the given model is in this pair in a self-referencing relationship
    pub fn get_related(&self, model_id: TypeId) -> Result<Option<TypeId>> {
        let (first, second) = (self.0.model_type, self.1.model_type);
        if first == model_id {
            if first == second {
                Ok(None)
            } else {
                Ok(Some(second))
            }
        } else if second == model_id {
            Ok(Some(first))
        } else {
            Err(format!(
                "model {:?} is not in relationship {}",
                model_id,
                self.rel_name(0)?
            )
            .into())
        }
    }
}

pub fn scan_model(model: &Struct, registry: &RelationshipRegistry) -> Result<Vec<CandidatePair>> {
    let candidates = model
        .iter_props()
        .filter_map(|(k, ty)| Candidate::new(model.get_id(), k.to_string(), ty, None).transpose())
        .collect::<Result<Vec<_>>>()?;

    candidates
        .into_iter()
        .map(|c| c.into_pair(registry))
        .collect()
}
