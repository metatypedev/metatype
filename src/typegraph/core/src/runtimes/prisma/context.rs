// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::model::ModelType;
use super::relationship::discovery::CandidatePair;
use super::relationship::RelationshipModel;
use super::{
    model::{InjectionHandler, Property, RelationshipProperty, ScalarProperty},
    relationship::discovery::RelationshipName,
};
use crate::errors::Result;
use crate::types::TypeId;
use crate::{sdk::runtimes as sdk, typegraph::TypegraphContext};
use indexmap::{map::Entry, IndexMap, IndexSet};
use std::{
    cell::{OnceCell, Ref, RefCell, RefMut},
    collections::HashMap,
    rc::{Rc, Weak},
};
use tg_schema::runtimes::prisma as cm;

use super::{errors, model::Model, relationship::Relationship};

#[derive(Debug, Clone)]
pub struct ModelRef(Rc<RefCell<Model>>);

impl ModelRef {
    pub fn borrow(&self) -> Ref<Model> {
        self.0.borrow()
    }

    pub fn borrow_mut(&self) -> RefMut<Model> {
        self.0.borrow_mut()
    }

    pub fn model_id(&self) -> TypeId {
        self.borrow().model_type.name_ref.id
    }

    pub fn model_type(&self) -> ModelType {
        self.borrow().model_type.clone()
    }

    pub fn name(&self) -> Rc<str> {
        self.borrow().model_type.name_ref.name.clone()
    }

    pub fn get_rel_name(&self, prop: &str) -> Option<String> {
        self.borrow().relationships.get(prop).cloned()
    }
}

impl From<Rc<RefCell<Model>>> for ModelRef {
    fn from(model: Rc<RefCell<Model>>) -> Self {
        Self(model)
    }
}

#[derive(Default, Debug)]
pub struct PrismaContext {
    models: IndexMap<TypeId, ModelRef>,
    pub models_by_name: IndexMap<Rc<str>, TypeId>,
    pub relationships: IndexMap<String, Relationship>,
    pub typegen_cache: OnceCell<Weak<RefCell<HashMap<String, TypeId>>>>, // shared
    complete_registrations: IndexSet<TypeId>,
}

impl PrismaContext {
    pub fn model(&self, type_id: TypeId) -> Result<ModelRef> {
        let model_type: ModelType = type_id.try_into()?;
        let model = self
            .models
            .get(&model_type.name_ref.id)
            .ok_or_else(|| errors::unregistered_model(type_id))?;

        Ok(model.clone())
    }

    pub fn is_registered(&self, pair: &CandidatePair) -> Result<bool> {
        let left_model = &pair.0.model;
        let right_model = &pair.1.model;

        let left = self.models.contains_key(&left_model.model_id())
            && self.models_by_name.contains_key(&left_model.name())
            && left_model.get_rel_name(&pair.1.field_name).is_some();

        let right = self.models.contains_key(&right_model.model_id())
            && self.models_by_name.contains_key(&right_model.name())
            && right_model.get_rel_name(&pair.0.field_name).is_some();

        match (left, right) {
            (true, true) => Ok(true),
            (true, false) | (false, true) => {
                Err(format!("Pair partially registered: pair={pair:?}").into())
            }
            (false, false) => Ok(false),
        }
    }

    pub fn register_relationship(
        &mut self,
        name: RelationshipName,
        relationship: Relationship,
    ) -> Result<()> {
        use indexmap::map::Entry as E;
        use RelationshipName::*;
        match name {
            User(name) => match self.relationships.entry(name.clone()) {
                E::Occupied(rel) => {
                    let rel = rel.get();
                    return Err(format!("relationship name '{}' already used between {} and {}, please provide another name",
                        name, rel.left.model_type.name(), rel.right.model_type.name()).into());
                }
                E::Vacant(e) => {
                    e.insert(relationship);
                }
            },

            Generated(name) => match self.relationships.entry(name.clone()) {
                E::Occupied(rel) => {
                    let rel = rel.get();
                    return Err(format!("generated relationship name '{}' already used between {} and {}, please provide a name",
                                    name, rel.left.model_type.name(), rel.right.model_type.name()).into());
                }
                E::Vacant(e) => {
                    e.insert(relationship);
                }
            },
        }

        Ok(())
    }

    pub fn register_pair(&mut self, pair: CandidatePair) -> Result<bool> {
        if !self.is_registered(&pair)? {
            let pair = pair.ordered()?;

            let rel_name = pair.rel_name()?;
            let CandidatePair(left, right) = pair;

            let relationship = Relationship {
                name: rel_name.to_string(),
                left: RelationshipModel {
                    wrapper_type: left.property.wrapper_type_id,
                    cardinality: left.property.quantifier,
                    model_type: left.model.model_type(),
                    field: right.field_name.clone(),
                },
                right: RelationshipModel {
                    wrapper_type: right.property.wrapper_type_id,
                    cardinality: right.property.quantifier,
                    model_type: right.model.model_type(),
                    field: left.field_name.clone(),
                },
            };

            self.register_relationship(rel_name.clone(), relationship)?;

            {
                let mut left_model = left.model.borrow_mut();
                left_model
                    .relationships
                    .insert(right.field_name.clone(), rel_name.to_string());
            }

            {
                let mut right_model = right.model.borrow_mut();
                right_model
                    .relationships
                    .insert(left.field_name.clone(), rel_name.into());
            }

            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub fn manage(&mut self, model_id: TypeId) -> Result<()> {
        if self.complete_registrations.contains(&model_id) {
            return Ok(());
        }

        let models = self.register_models(model_id)?;

        if models.is_empty() {
            // model already registered
            // relationship registration left
            let model = self.model(model_id)?;
            for pair in self.scan_model(model)? {
                self.register_pair(pair)?;
            }
            self.complete_registrations.insert(model_id);
        } else {
            for model_id in models.into_iter() {
                self.manage(model_id)?;
            }
        }

        Ok(())
    }

    /// register the model, and related models (recursively)
    /// returns the registered models
    /// returns empty if the given root model is already registered
    fn register_models(&mut self, root_model_id: TypeId) -> Result<Vec<TypeId>> {
        let model_type: ModelType = root_model_id.try_into()?;
        let model_id = model_type.name_ref.id;
        if let Entry::Vacant(e) = self.models.entry(model_id) {
            let model: ModelRef = Rc::new(RefCell::new(model_id.try_into()?)).into();
            e.insert(model.clone());
            let model_name = model.borrow().model_type.name();
            self.models_by_name.insert(model_name, model_id);

            let mut res = vec![model_id];

            // register related models
            {
                let model = model.borrow();
                for related in model.iter_related_models() {
                    res.extend(self.register_models(related.type_id)?);
                }
            }

            Ok(res)
        } else {
            Ok(vec![])
        }
    }

    fn convert_scalar_prop(
        &self,
        ctx: &mut TypegraphContext,
        key: &str,
        prop: &ScalarProperty,
    ) -> Result<cm::ScalarProperty> {
        Ok(cm::ScalarProperty {
            key: key.to_string(),
            cardinality: prop.quantifier.into(),
            type_idx: ctx.register_type(prop.wrapper_type_id)?.into(),
            prop_type: prop.prop_type.clone(),
            injection: prop.injection.as_ref().map(|inj| cm::ManagedInjection {
                create: inj.create.as_ref().and_then(|handler| match handler {
                    InjectionHandler::Typegate => None,
                    InjectionHandler::PrismaDateNow => Some(cm::Injection::DateNow),
                }),
                update: inj.update.as_ref().and_then(|handler| match handler {
                    InjectionHandler::Typegate => None,
                    InjectionHandler::PrismaDateNow => Some(cm::Injection::DateNow),
                }),
            }),
            unique: prop.unique,
            auto: prop.auto,
            default_value: prop.default_value.clone(),
        })
    }

    fn convert_relationship_prop(
        &self,
        ctx: &mut TypegraphContext,
        key: &str,
        prop: &RelationshipProperty,
        rel_name: String,
    ) -> Result<cm::RelationshipProperty> {
        let model = self.model(prop.model_type.type_id)?;
        let model = model.borrow();

        Ok(cm::RelationshipProperty {
            key: key.to_string(),
            cardinality: prop.quantifier.into(),
            type_idx: ctx.register_type(prop.wrapper_type_id)?.into(),
            model_name: model.model_type.name().to_string(),
            unique: prop.unique,
            relationship_name: rel_name.clone(),
            relationship_side: {
                let rel = self.relationships.get(&rel_name).unwrap();
                if rel.left.wrapper_type == prop.wrapper_type_id {
                    cm::Side::Left
                } else if rel.right.wrapper_type == prop.wrapper_type_id {
                    cm::Side::Right
                } else {
                    unreachable!()
                }
            },
        })
    }

    fn convert_model(
        &self,
        ctx: &mut TypegraphContext,
        model: &Model,
        type_id: TypeId,
    ) -> Result<cm::Model> {
        Ok(cm::Model {
            type_idx: ctx.register_type(type_id)?.into(),
            type_name: model.model_type.name().to_string(),
            props: model
                .props
                .iter()
                .map(|(key, prop): (&String, &Property)| -> Result<_> {
                    Ok(match prop {
                        Property::Scalar(prop) => Some(cm::Property::Scalar(
                            self.convert_scalar_prop(ctx, key, prop)?,
                        )),

                        Property::Model(prop) => {
                            let rel_name = {
                                let model = self.model(type_id)?;
                                let model = model.borrow();
                                model.relationships.get(key).unwrap().clone()
                            };

                            Some(cm::Property::Relationship(
                                self.convert_relationship_prop(ctx, key, prop, rel_name)?,
                            ))
                        }

                        Property::Unmanaged(_) => {
                            // skip
                            None
                        }
                    })
                })
                .filter_map(|r| r.transpose())
                .collect::<Result<Vec<_>>>()?,
            id_fields: model.id_fields.clone(),
            unique_constraints: model.unique_constraints.clone(),
        })
    }

    pub fn convert(
        &self,
        ctx: &mut TypegraphContext,
        data: Rc<sdk::PrismaRuntimeData>,
    ) -> Result<cm::PrismaRuntimeData> {
        Ok(cm::PrismaRuntimeData {
            name: data.name.clone(),
            connection_string_secret: data.connection_string_secret.clone(),
            models: self
                .models
                .iter()
                .map(|(type_id, model)| -> Result<_> {
                    let model = model.borrow();
                    self.convert_model(ctx, &model, *type_id)
                })
                .collect::<Result<Vec<_>>>()?,

            relationships: {
                self.relationships
                    .iter()
                    .map(|(_, rel)| {
                        let left = self.convert_relationship_model(ctx, rel.left.clone())?;
                        let right = self.convert_relationship_model(ctx, rel.right.clone())?;
                        Ok(cm::Relationship {
                            name: rel.name.clone(),
                            left,
                            right,
                        })
                    })
                    .collect::<Result<Vec<_>>>()?
            },
            migration_options: None,
        })
    }

    fn convert_relationship_model(
        &self,
        ctx: &mut TypegraphContext,
        model: RelationshipModel,
    ) -> Result<cm::RelationshipModel> {
        Ok(cm::RelationshipModel {
            type_idx: ctx.register_type(model.model_type.type_id)?.into(),
            field: model.field.clone(),
            cardinality: model.cardinality.into(),
        })
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::test_utils::*;

    #[test]
    fn test_recursive_model_registration() -> Result<()> {
        let mut ctx = PrismaContext::default();
        let (user, profile) = models::simple_relationship()?;

        let models: Vec<_> = ctx
            .register_models(user)?
            .into_iter()
            .map(|model_id| {
                let model = ctx.model(model_id).unwrap();
                (model.model_id(), model.name().clone())
            })
            .collect();

        assert_eq!(
            models,
            vec![
                (user, user.name()?.unwrap().into()),
                (profile, profile.name()?.unwrap().into())
            ]
        );

        Ok(())
    }

    #[test]
    fn test_relationship_registration() -> Result<()> {
        let mut ctx = PrismaContext::default();
        let (user, post) = models::simple_relationship().unwrap();

        ctx.manage(user)?;

        assert_eq!(ctx.models.len(), 2);
        let user = ctx.model(user)?;
        let user = user.borrow();
        assert_eq!(user.relationships.len(), 1);

        let post = ctx.model(post)?;
        let post = post.borrow();
        assert_eq!(post.relationships.len(), 1);

        assert!(user.relationships.get("posts").is_some());
        assert_eq!(
            user.relationships.get("posts"),
            post.relationships.get("author")
        );

        Ok(())
    }
}
