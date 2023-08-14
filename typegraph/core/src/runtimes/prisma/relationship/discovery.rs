use std::collections::HashSet;

use crate::global_store::with_store;
use crate::types::Type;
use crate::wit::core::TypeId;
use crate::{errors::Result, types::Struct};

use super::RelationshipRegistry;
use super::{Cardinality, Relationship, RelationshipModel};

pub fn scan_model(model: &Struct, registry: &RelationshipRegistry) -> Result<Vec<Relationship>> {
    with_store(|s| {
        let mut result = Vec::new();
        let mut self_relationships = HashSet::new();

        for (prop, ty) in model.data.props.iter() {
            let ty = s.resolve_proxy(*ty)?;
            // TODO why would it be possible to have self relationship?
            if registry.has(ty, prop)
            /* || self_relationships.contains(&ty) */
            {
                continue;
            }

            match s.get_type(ty)? {
                Type::Struct(target_model) => {
                    if model.id == target_model.id {
                        self_relationships.insert(prop.to_string());
                    } else {
                        let source = RelationshipModel {
                            model: model.id,
                            field: prop.to_string(),
                            cardinality: Cardinality::One,
                        };
                        result.push(Relationship::from_one(source)?)
                    }
                } // TODO: type optional
                // TODO: type list
                _ => {}
            }
        }

        // TODO add self relationships

        Ok(result)
    })
}

impl RelationshipModel {
    fn find_targets(source: &RelationshipModel) -> Result<Vec<RelationshipModel>> {
        todo!()
    }

    fn target_type(&self) -> Result<TypeId> {
        with_store(|s| {
            s.type_as_struct(self.model)?
                .data
                .get_prop_type(&self.field)
                .ok_or_else(|| {
                    // crate::errors::property_not_found_in(s.get_type_repr(self.model), &self.field)
                    format!(
                        "property {:?} not found in {:?}",
                        self.field,
                        s.get_type_repr(self.model)
                    )
                })
        })
    }

    fn target_field(&self) -> Result<Option<String>> {
        with_store(|s| {
            let target_type = self.target_type()?;
            let target_type = s.get_type(target_type)?;
            Ok(match target_type {
                Type::Proxy(p) => p.data.get_extra("target_field").map(|s| s.to_string()),
                _ => None,
            })
        })
    }

    pub fn rel_name(&self) -> Result<Option<String>> {
        let target_type = self.target_type()?;
        with_store(|s| {
            let target_type = s.get_type(target_type)?;
            Ok(match target_type {
                Type::Proxy(p) => p.data.get_extra("rel_name").map(|s| s.to_string()),
                _ => None,
            })
        })
    }

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

impl Relationship {
    fn from_side(side: RelationshipModel) -> Result<Relationship> {
        match side.cardinality {
            Cardinality::One => Self::from_one(side),
            _ => todo!(),
        }
    }

    pub fn from_one(source: RelationshipModel) -> Result<Relationship> {
        assert!(source.cardinality == Cardinality::One);

        let alternatives = RelationshipModel::find_targets(&source)?;

        match alternatives.len() {
            // TODO
            0 => Err("relationship not found".to_string()),
            1 => {
                //
                todo!()
            }
            _ => {
                let rel_name = source.rel_name()?;
                if let Some(rel_name) = rel_name {
                    // match with rel_name
                    todo!()
                } else {
                    // match target field
                    let target_field = source.target_field()?;
                    if let Some(target_field) = target_field {
                        todo!() // 540
                    } else {
                        // Err(errors::ambiguous_targets)
                        Err(format!("ambiguouse target: multiple matching targets"))
                    }
                }
            }
        }
    }
}

fn find_named_relationship(
    alternatives: Vec<RelationshipModel>,
    source: &RelationshipModel,
    target_model: TypeId,
    rel_name: &str,
) -> Result<RelationshipModel> {
    let mut with_matching_name = None;
    let mut unnamed = vec![];

    for alt in alternatives.into_iter() {
        match alt.rel_name()? {
            Some(rel_name) => {
                if rel_name == rel_name {
                    // with_matching_name.push(alt);
                    if let Some(m) = with_matching_name {
                        todo!();
                        // return Err(errors::ambiguous_targets(
                        //     source.model,
                        //     source.field,
                        //     target_model,
                        //     rel_name,
                        //     m,
                        // ));
                    } else {
                        with_matching_name = Some(alt);
                    }
                } else {
                    // no-op
                }
            }
            None => unnamed.push(alt),
        }
    }

    if let Some(found) = with_matching_name {
        Ok(found)
    } else {
        match unnamed.len() {
            0 => Err(format!("relationship target not found for {rel_name}")),
            1 => Ok(unnamed.into_iter().next().unwrap()),
            // TODO add more context on the error messages
            _ => Err(format!(
                "ambiguous target: cannot choose from multiple unnamed matching targets; please set an explicit relationship name on the target"
            )),
        }
    }
}

#[cfg(test)]
mod test {
    #[test]
    fn test_relationship_discovery() {
        //
    }
}
