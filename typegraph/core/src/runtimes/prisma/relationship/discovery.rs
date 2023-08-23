// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::global_store::with_store;
use crate::runtimes::prisma::relationship::get_rel_name;
use crate::runtimes::prisma::type_utils::as_relationship_source;
use crate::wit::core::TypeId;
use crate::{errors::Result, types::Struct};

use super::{Relationship, RelationshipModel};
use super::{RelationshipRegistry, RelationshipSource};

/// scan model `model` for relationships
pub fn scan_model(model: &Struct, _registry: &RelationshipRegistry) -> Result<Vec<Relationship>> {
    with_store(|_s| {
        let mut result = Vec::new();
        // let mut self_relationships = HashSet::new();

        for (prop, ty) in model.data.props.iter() {
            let source = as_relationship_source(*ty)?;
            if let Some(source) = source {
                if source.model_type == model.id {
                    // self relationship
                    todo!()
                } else {
                    result.push(Relationship::from(
                        source,
                        RelationshipTarget {
                            model_type: model.id,
                            field: prop.to_string(),
                        },
                    )?);
                }
            }
        }

        // TODO add self relationships

        Ok(result)
    })
}

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

impl Relationship {
    pub fn from(source: RelationshipSource, target: RelationshipTarget) -> Result<Self> {
        with_store(|s| {
            // TODO filter: runtime?
            let mut alternatives: Vec<_> = s
                .type_as_struct(source.model_type)?
                .data
                .props
                .iter()
                .filter_map(|(k, ty)| {
                    // TODO runtime
                    as_relationship_source(*ty)
                        .unwrap()
                        .filter(|s| s.model_type == target.model_type)
                        .map(|s| {
                            (
                                k.to_owned(),
                                RelationshipModel::from_source(s, target.field.clone()),
                            )
                        })
                })
                .collect();

            if let Some((prop, target)) = get_unique_alternative(
                &mut alternatives,
                &format!("all targets: source={source:?}, target={target:?}"),
            )? {
                return (RelationshipModel::from_source(source, prop), target).try_into();
            }

            if let Some(rel_name) = get_rel_name(source.wrapper_type)? {
                alternatives.retain(|(_k, t)| {
                    get_rel_name(t.wrapper_type).unwrap().as_deref() == Some(&rel_name)
                });
                if let Some((prop, target)) = get_unique_alternative(
                    &mut alternatives,
                    &format!("finding relationships matching relation name {rel_name}"),
                )? {
                    return (RelationshipModel::from_source(source, prop), target).try_into();
                }
            }

            // TODO target field

            Err("Ambiguous target".to_string())
        })
    }

    // fn get_target(
    //     source: RelationshipSource,
    //     alternatives: Vec<(String, RelationshipModel)>,
    // ) -> Result<(String, RelationshipModel)> {
    //     match alternatives.len() {
    //         0 => Err("no target for relationship".to_string()),
    //         1 => alternatives.into_iter().next().unwrap(),
    //         _ => {
    //             let mut alternatives = alternatives;
    //             if let Some(rel_name) = get_rel_name(source.wrapper_type)? {
    //                 alternatives = alternatives.into_iter().filter(|(k, target)| {
    //                     get_rel_name(target.wrapper_type)
    //                         .map(|name| name == rel_name)
    //                         .unwrap_or(false)
    //                 })
    //             }
    //         }
    //     }
    // }

    // pub fn from_one(source: RelationshipModel) -> Result<Relationship> {
    //     assert!(source.cardinality == Cardinality::One);
    //
    //     let alternatives = RelationshipModel::find_targets(&source)?;
    //
    //     let target = match alternatives.len() {
    //         0 => return Err("relationship not found".to_string()),
    //
    //         1 => alternatives.into_iter().next().unwrap(),
    //
    //         _ => {
    //             let rel_name = source.rel_name()?;
    //
    //             if let Some(rel_name) = rel_name {
    //                 let alternatives: Vec<_> = alternatives
    //                     .into_iter()
    //                     .filter(|alt| {
    //                         alt.rel_name()
    //                             .ok()
    //                             .flatten()
    //                             .map(|r| &r == &rel_name)
    //                             .unwrap_or(false)
    //                     })
    //                     .collect();
    //
    //                 match alternatives.len() {
    //                     0 => {
    //                         return Err(format!("no matching relationship found: name={rel_name}"))
    //                     }
    //                     1 => alternatives.into_iter().next().unwrap(),
    //                     // cannot duplicate name
    //                     _ => return Err("multiple matching relationships".to_string()),
    //                 }
    //             } else {
    //                 // match target field
    //                 let target_field = source.target_field()?;
    //                 if let Some(target_field) = target_field {
    //                     // find matching field
    //                     let alternatives: Vec<_> = alternatives
    //                         .into_iter()
    //                         .filter(|alt| alt.field == target_field)
    //                         .collect();
    //                     match alternatives.len() {
    //                         0 => {
    //                             return Err(format!(
    //                                 "no matching relationship found: field={target_field}"
    //                             ))
    //                         }
    //                         1 => alternatives.into_iter().next().unwrap(),
    //                         _ => {
    //                             return Err("ambiguous multiple matching relationships".to_string())
    //                         }
    //                     }
    //                 } else {
    //                     // Err(errors::ambiguous_targets)
    //                     return Err(format!("ambiguouse target: multiple matching targets"));
    //                 }
    //             }
    //         }
    //     };
    //
    //     match target.cardinality {
    //         // TODO
    //         Cardinality::Optional => (target, source).try_into(),
    //
    //         Cardinality::One => {
    //             match (has_fkey(source.model)?, has_fkey(target.model)?) {
    //                 (Some(true), Some(true)) => return Err("both sides have fkey".to_string()),
    //                 (Some(false), Some(false)) => return Err("neither side has fkey".to_string()),
    //                 (Some(true), _) | (_, Some(false)) => (source, target).try_into(),
    //                 (_, Some(true)) | (Some(false), _) => (target, source).try_into(),
    //                 (None, None) => {
    //                     // check unique ref
    //                     with_store(|s| {
    //                         //
    //                         match (
    //                             type_utils::is_unique_ref(source.model)?,
    //                             type_utils::is_unique_ref(target.model)?,
    //                         ) {
    //                             (true, true) => {
    //                                 return Err("both sides are unique".to_string());
    //                             }
    //                             (true, false) => (source, target).try_into(),
    //                             (false, true) => (target, source).try_into(),
    //                             (false, false) => {
    //                                 return Err(
    //                                     "ambiguous target: neither side is unique".to_string()
    //                                 );
    //                             }
    //                         }
    //                     })
    //                 }
    //             }
    //         }
    //
    //         Cardinality::Many => todo!(),
    //     }
    // }

    // pub fn from_optional(source: RelationshipModel) -> Result<Relationship> {
    //     todo!()
    // }
    //
    // pub fn from_many(source: RelationshipModel) -> Result<Relationship> {
    //     todo!()
    // }
}

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
