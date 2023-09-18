// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::global_store::with_store;
use crate::runtimes::prisma::type_utils::as_relationship_target;
use crate::types::{TypeFun, TypeId};
use crate::wit::core::Error as TgError;
use crate::{errors::Result, types::Struct};

use super::{Cardinality, Relationship, RelationshipModel, TargetAttributes};
use super::{RelationshipRegistry, RelationshipSource};

#[derive(Debug)]
pub struct Candidate {
    pub source_model: TypeId,
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

// impl Into<RelationshipModel> for Candidate {
//     fn into(self) -> RelationshipModel {
//         RelationshipModel {
//             model_type: self.model_type,
//             model_name: self.model_name,
//             wrapper_type: self.wrapper_type,
//             cardinality: self.cardinality,
//             field: self.field_name,
//         }
//     }
// }

impl Candidate {
    fn new(
        source_model: TypeId,
        field: String,
        type_id: TypeId,
        source_candidate: Option<&Candidate>,
    ) -> Result<Option<Candidate>> {
        with_store(|s| -> Result<_> {
            let attrs = s.get_attributes(type_id)?;

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

                    let model_name = s
                        .get_type(target_type)?
                        .get_base()
                        .unwrap()
                        .name
                        .clone()
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
        })
    }

    fn into_pair(self, registry: &RelationshipRegistry) -> Result<CandidatePair> {
        let alternatives = self.get_alternatives(registry)?;
        match alternatives.len() {
            0 => Err(format!("no alternatives found for {:?}", self).into()),
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
                ))
            }
        }
    }

    // fn into_relationship(self, registry: &RelationshipRegistry) -> Result<Relationship> {
    //     let alternatives = self.get_alternatives()?;
    //     match alternatives.len() {
    //         0 => Err(format!("no alternatives found for {:?}", self).into()),
    //         1 => {
    //             let target = alternatives.into_iter().next().unwrap();
    //             Relationship::from_candidates(CandidatePair(self, target), registry)
    //         }
    //         _ => Err(format!("multiple alternative targets found for {:?}", self).into()),
    //     }
    // }

    /// get potential targets for this candidate
    fn get_alternatives(&self, registry: &RelationshipRegistry) -> Result<Vec<Candidate>> {
        let candidates = with_store(|s| -> Result<_> {
            self.model_type
                .as_struct(s)?
                .data
                .props
                .iter()
                .filter_map(|(k, ty)| {
                    Candidate::new(self.model_type, k.clone(), ty.into(), Some(self))
                        .map(|maybe_candidate| {
                            maybe_candidate.filter(|c| !registry.has(c.model_type, &c.field_name))
                            // .filter(|c| {
                            //     // TODO move to constructor
                            //     c.model_type == self.source_model
                            //         && c.source_model == self.model_type
                            // })
                            // match relationship name
                            // .filter(|c| match (&c.relationship_name, &self.relationship_name) {
                            //     (Some(a), Some(b)) => a == b,
                            //     _ => true,
                            // })
                            // .filter(|c| {
                            //     c.target_field.as_ref().map(|f| f == &self.field_name).unwrap_or(true)
                            //         && self.target_field.as_ref().map(|f| f == &c.field_name).unwrap_or(true)
                            // })

                            // TODO match target field
                        })
                        .transpose()
                })
                .collect::<Result<Vec<_>>>()
        })?;

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
            
                match (first.fkey, second.fkey) {
                    (Some(true), Some(false)) => Ok(Self(first, second)),
                    (Some(false), Some(true)) => Ok(Self(second, first)),
                    (Some(true), Some(true)) => {
                        todo!(
                            "conflicting fkey: {} and {}",
                            first.field_name,
                            second.field_name
                        )
                    }
                    (Some(false), Some(false)) => Err(format!(
                        "no fkey: {} and {}",
                        first.field_name, second.field_name
                    )),
                    (Some(true), None) => Ok(Self(first, second)),
                    (Some(false), None) => Ok(Self(second, first)),
                    (None, Some(true)) => Ok(Self(second, first)),
                    (None, Some(false)) => Ok(Self(first, second)),
                    (None, None) => {
                        // choose by unique attribute
                        match (first.unique, second.unique) {
                            (true, false) => Ok(Self(first, second)),
                            (false, true) => Ok(Self(second, first)),
                            (true, true) => Err(format!(
                                "conflicting unique: {} and {}",
                                first.field_name, second.field_name
                            )),
                            (false, false) => Err(format!(
                                "no unique: {} and {}",
                                first.field_name, second.field_name
                            )),
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
                ))
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
        } else {
            if second == model_id {
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
}

// impl TryFrom<CandidatePair> for Relationship {
//     type Error = TgError;
//
//     fn try_from(pair: CandidatePair) -> Result<Self> {
//         let pair = pair.ordered()?;
//         let name = pair.rel_name()?.to_string();
//         let CandidatePair(left, right) = pair;
//         Ok(Self {
//             name,
//             left: RelationshipModel {
//                 model_type: left.model_type,
//                 model_name: left.model_name,
//                 wrapper_type: left.wrapper_type,
//                 field: right.field_name,
//                 cardinality: left.cardinality,
//             },
//             right: RelationshipModel {
//                 model_type: right.model_type,
//                 model_name: right.model_name,
//                 wrapper_type: right.wrapper_type,
//                 field: left.field_name,
//                 cardinality: right.cardinality,
//             },
//         })
//     }
// }

pub fn scan_model(model: &Struct, registry: &RelationshipRegistry) -> Result<Vec<CandidatePair>> {
    let candidates = model
        .data
        .props
        .iter()
        .filter_map(|(k, ty)| {
            Candidate::new(model.get_id(), k.clone(), ty.into(), None).transpose()
        })
        .collect::<Result<Vec<_>>>()?;
    eprintln!("candidates: {:#?}", candidates);
    // TODO: remove duplicate for self-references
    candidates
        .into_iter()
        .map(|c| c.into_pair(registry))
        .collect()
}

/// scan model `model` for relationships
// pub fn scan_model(model: &Struct, _registry: &RelationshipRegistry) -> Result<Vec<Relationship>> {
//     with_store(|_s| {
//         let mut result = Vec::new();
//         // let mut self_relationships = HashSet::new();
//
//         for (prop, ty) in model.data.props.iter() {
//             let source = as_relationship_source((*ty).into())?;
//             if let Some((source, target_attrs)) = source {
//                 if source.model_type == model.id {
//                     result.push(Relationship::self_reference(source, prop, target_attrs)?);
//                 } else {
//                     result.push(Relationship::from(
//                         source,
//                         RelationshipTarget {
//                             model_type: model.id,
//                             field: prop.to_string(),
//                             attrs: target_attrs,
//                         },
//                     )?);
//                 }
//             }
//         }
//
//         Ok(result)
//     })
// }
use super::RelationshipTarget;

impl RelationshipModel {
    fn list_alternatives(_source_type: TypeId, _target_model: TypeId) {
        todo!()
    }

    fn find_targets(_source_type: TypeId, _target_model: TypeId) -> Result<Vec<RelationshipModel>> {
        todo!()
    }

    // fn target_type(&self) -> Result<TypeId> {
    //     with_store(|s| {
    //         s.type_as_struct(self.model)?
    //             .data
    //             .get_prop_type(&self.field)
    //             .ok_or_else(|| {
    //                 // crate::errors::property_not_found_in(s.get_type_repr(self.model), &self.field)
    //                 format!(
    //                     "property {:?} not found in {:?}",
    //                     self.field,
    //                     s.get_type_repr(self.model)
    //                 )
    //             })
    //     })
    // }

    // fn target_field(&self) -> Result<Option<String>> {
    //     with_store(|s| {
    //         let target_type = self.target_type()?;
    //         let target_type = s.get_type(target_type)?;
    //         Ok(match target_type {
    //             Type::Proxy(p) => p.data.get_extra("target_field").map(|s| s.to_string()),
    //             _ => None,
    //         })
    //     })
    // }

    // fn name(&self) -> Result<String> {
    //     with_store(|s| {
    //         let model = s.type_as_struct(self.model)?;
    //         if let Some(name) = &model.base.name {
    //             Ok(name.clone())
    //         } else {
    //             Ok(format!("object_{}", self.model))
    //         }
    //     })
    // }
}

struct TargetAlternatives<'a> {
    source: &'a RelationshipSource,
    alternatives: Vec<(String, RelationshipSource)>,
}

impl<'a> TargetAlternatives<'a> {
    fn check(&mut self) -> Result<Option<(String, RelationshipSource)>> {
        match self.alternatives.len() {
            0 => Err("no match".to_string()),
            1 => Ok(std::mem::take(&mut self.alternatives).into_iter().next()),
            _ => Ok(None),
        }
    }

    // fn apply_filter(&mut self, filter: impl Fn(&RelationshipTarget) -> bool) {
    //     self.alternatives.retain(filter);
    // }

    // return Ok(Some(_)) when a single match is found
    // Ok(None) if the source has no rel_name
    // Err(_) if no match or multiple match or error
}

fn get_unique_alternative(
    alternatives: &mut Vec<(String, RelationshipModel)>,
    criteria: &str,
) -> Result<Option<(String, RelationshipModel)>> {
    match alternatives.len() {
        0 => Err(format!("no matching alternative: {criteria}")),
        1 => Ok(std::mem::take(alternatives).into_iter().next()),
        _ => Ok(None),
    }
}

// impl Relationship {
//     pub fn from(source: RelationshipSource, target: RelationshipTarget) -> Result<Self> {
//         with_store(|s| {
//             // TODO filter: runtime?
//             let mut alternatives: Vec<_> = s
//                 .type_as_struct(source.model_type)?
//                 .data
//                 .props
//                 .iter()
//                 .filter_map(|(k, ty)| {
//                     // TODO runtime
//                     as_relationship_source((*ty).into())
//                         .unwrap()
//                         .filter(|(s, _)| s.model_type == target.model_type)
//                         .map(|(s, t)| {
//                             (
//                                 k.to_owned(),
//                                 RelationshipModel::from_source(
//                                     s,
//                                     target.field.clone(),
//                                     target.attrs.clone(),
//                                 ),
//                                 t,
//                             )
//                         })
//                 })
//                 .collect();
//
//             if let Some((prop, target, target_attrs)) = Self::filter_alternatives(
//                 alternatives,
//                 get_rel_name(source.wrapper_type)?.as_deref(),
//                 &format!("from {source:?} to {target:?}"),
//             )? {
//                 (
//                     RelationshipModel::from_source(source, prop, target_attrs),
//                     target,
//                 )
//                     .try_into()
//             } else {
//                 Err("Ambiguous target".to_string())
//             }
//         })
//     }
//
//     pub fn self_reference(
//         source: RelationshipSource,
//         target_field: &str,
//         target_attrs: TargetAttributes,
//     ) -> Result<Self> {
//         with_store(|store| {
//             let mut alternatives: Vec<_> = store
//                 .type_as_struct(source.model_type)?
//                 .data
//                 .props
//                 .iter()
//                 .filter_map(|(k, ty)| {
//                     eprintln!("k={:?}, ty={:?}", k, ty);
//                     if k == target_field {
//                         None
//                     } else {
//                         as_relationship_source((*ty).into())
//                             .unwrap()
//                             .filter(|(s, _)| s.model_type == source.model_type)
//                             .map(|(s, t)| {
//                                 (
//                                     k.to_owned(),
//                                     RelationshipModel::from_source(s, target_field.to_string(), t),
//                                 )
//                             })
//                     }
//                 })
//                 .collect();
//
//             if let Some((prop, target)) = Self::filter_alternatives(
//                 alternatives,
//                 get_rel_name(source.wrapper_type)?.as_deref(),
//                 "self relations from {source:?}; target_field={target_field}",
//             )? {
//                 (RelationshipModel::from_source(source, prop), target).try_into()
//             } else {
//                 Err("Ambiguous target".to_string())
//             }
//         })
//     }
//
//     fn filter_alternatives(
//         mut alternatives: Vec<(String, RelationshipModel)>,
//         rel_name: Option<&str>,
//         description: &str,
//     ) -> Result<Option<(String, RelationshipModel)>> {
//         // let mut alternatives = alternatives;
//         if let Some((prop, target)) = get_unique_alternative(&mut alternatives, description)? {
//             return Ok(Some((prop.to_string(), target)));
//         }
//
//         if let Some(rel_name) = rel_name {
//             alternatives.retain(|(_k, t)| {
//                 get_rel_name(t.wrapper_type).unwrap().as_deref() == Some(&rel_name)
//             });
//             if let Some((prop, target)) = get_unique_alternative(
//                 &mut alternatives,
//                 &format!("finding relationships matching relation name {rel_name}"),
//             )? {
//                 return Ok(Some((prop.to_string(), target)));
//             }
//         }
//
//         // TODO target field
//
//         Err("Ambiguous target".to_string())
//     }
//
//     // fn get_target(
//     //     source: RelationshipSource,
//     //     alternatives: Vec<(String, RelationshipModel)>,
//     // ) -> Result<(String, RelationshipModel)> {
//     //     match alternatives.len() {
//     //         0 => Err("no target for relationship".to_string()),
//     //         1 => alternatives.into_iter().next().unwrap(),
//     //         _ => {
//     //             let mut alternatives = alternatives;
//     //             if let Some(rel_name) = get_rel_name(source.wrapper_type)? {
//     //                 alternatives = alternatives.into_iter().filter(|(k, target)| {
//     //                     get_rel_name(target.wrapper_type)
//     //                         .map(|name| name == rel_name)
//     //                         .unwrap_or(false)
//     //                 })
//     //             }
//     //         }
//     //     }
//     // }
//
//     // pub fn from_one(source: RelationshipModel) -> Result<Relationship> {
//     //     assert!(source.cardinality == Cardinality::One);
//     //
//     //     let alternatives = RelationshipModel::find_targets(&source)?;
//     //
//     //     let target = match alternatives.len() {
//     //         0 => return Err("relationship not found".to_string()),
//     //
//     //         1 => alternatives.into_iter().next().unwrap(),
//     //
//     //         _ => {
//     //             let rel_name = source.rel_name()?;
//     //
//     //             if let Some(rel_name) = rel_name {
//     //                 let alternatives: Vec<_> = alternatives
//     //                     .into_iter()
//     //                     .filter(|alt| {
//     //                         alt.rel_name()
//     //                             .ok()
//     //                             .flatten()
//     //                             .map(|r| &r == &rel_name)
//     //                             .unwrap_or(false)
//     //                     })
//     //                     .collect();
//     //
//     //                 match alternatives.len() {
//     //                     0 => {
//     //                         return Err(format!("no matching relationship found: name={rel_name}"))
//     //                     }
//     //                     1 => alternatives.into_iter().next().unwrap(),
//     //                     // cannot duplicate name
//     //                     _ => return Err("multiple matching relationships".to_string()),
//     //                 }
//     //             } else {
//     //                 // match target field
//     //                 let target_field = source.target_field()?;
//     //                 if let Some(target_field) = target_field {
//     //                     // find matching field
//     //                     let alternatives: Vec<_> = alternatives
//     //                         .into_iter()
//     //                         .filter(|alt| alt.field == target_field)
//     //                         .collect();
//     //                     match alternatives.len() {
//     //                         0 => {
//     //                             return Err(format!(
//     //                                 "no matching relationship found: field={target_field}"
//     //                             ))
//     //                         }
//     //                         1 => alternatives.into_iter().next().unwrap(),
//     //                         _ => {
//     //                             return Err("ambiguous multiple matching relationships".to_string())
//     //                         }
//     //                     }
//     //                 } else {
//     //                     // Err(errors::ambiguous_targets)
//     //                     return Err(format!("ambiguouse target: multiple matching targets"));
//     //                 }
//     //             }
//     //         }
//     //     };
//     //
//     //     match target.cardinality {
//     //         // TODO
//     //         Cardinality::Optional => (target, source).try_into(),
//     //
//     //         Cardinality::One => {
//     //             match (has_fkey(source.model)?, has_fkey(target.model)?) {
//     //                 (Some(true), Some(true)) => return Err("both sides have fkey".to_string()),
//     //                 (Some(false), Some(false)) => return Err("neither side has fkey".to_string()),
//     //                 (Some(true), _) | (_, Some(false)) => (source, target).try_into(),
//     //                 (_, Some(true)) | (Some(false), _) => (target, source).try_into(),
//     //                 (None, None) => {
//     //                     // check unique ref
//     //                     with_store(|s| {
//     //                         //
//     //                         match (
//     //                             type_utils::is_unique_ref(source.model)?,
//     //                             type_utils::is_unique_ref(target.model)?,
//     //                         ) {
//     //                             (true, true) => {
//     //                                 return Err("both sides are unique".to_string());
//     //                             }
//     //                             (true, false) => (source, target).try_into(),
//     //                             (false, true) => (target, source).try_into(),
//     //                             (false, false) => {
//     //                                 return Err(
//     //                                     "ambiguous target: neither side is unique".to_string()
//     //                                 );
//     //                             }
//     //                         }
//     //                     })
//     //                 }
//     //             }
//     //         }
//     //
//     //         Cardinality::Many => todo!(),
//     //     }
//     // }
//
//     // pub fn from_optional(source: RelationshipModel) -> Result<Relationship> {
//     //     todo!()
//     // }
//     //
//     // pub fn from_many(source: RelationshipModel) -> Result<Relationship> {
//     //     todo!()
//     // }
// }

// fn find_named_relationship(
//     alternatives: Vec<RelationshipModel>,
//     source: &RelationshipModel,
//     target_model: TypeId,
//     rel_name: &str,
// ) -> Result<RelationshipModel> {
//     let mut with_matching_name = None;
//     let mut unnamed = vec![];
//
//     for alt in alternatives.into_iter() {
//         match alt.rel_name()? {
//             Some(rel_name) => {
//                 if rel_name == rel_name {
//                     // with_matching_name.push(alt);
//                     if let Some(m) = with_matching_name {
//                         todo!();
//                         // return Err(errors::ambiguous_targets(
//                         //     source.model,
//                         //     source.field,
//                         //     target_model,
//                         //     rel_name,
//                         //     m,
//                         // ));
//                     } else {
//                         with_matching_name = Some(alt);
//                     }
//                 } else {
//                     // no-op
//                 }
//             }
//             None => unnamed.push(alt),
//         }
//     }
//
//     if let Some(found) = with_matching_name {
//         Ok(found)
//     } else {
//         match unnamed.len() {
//             0 => Err(format!("relationship target not found for {rel_name}")),
//             1 => Ok(unnamed.into_iter().next().unwrap()),
//             // TODO add more context on the error messages
//             _ => Err(format!(
//                 "ambiguous target: cannot choose from multiple unnamed matching targets; please set an explicit relationship name on the target"
//             )),
//         }
//     }
// }
