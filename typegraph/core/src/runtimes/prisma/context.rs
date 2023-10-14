// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{
    cell::{Cell, OnceCell, Ref, RefCell, RefMut},
    collections::HashMap,
    rc::{Rc, Weak},
};

use crate::{typegraph::TypegraphContext, wit::runtimes as wit};
use common::typegraph::runtimes::prisma as cm;
use indexmap::{map::Entry, IndexMap, IndexSet};

use super::relationship::{
    discovery::{Candidate, CandidatePair},
    RelationshipModel,
};
use crate::errors::Result;
use crate::types::TypeId;

use super::{errors, relationship::Relationship, utils::model::Model};

#[derive(Debug, Clone)]
pub struct ModelRef(Rc<RefCell<Model>>);

impl ModelRef {
    pub fn borrow(&self) -> Ref<Model> {
        self.0.borrow()
    }

    pub fn borrow_mut(&self) -> RefMut<Model> {
        self.0.borrow_mut()
    }

    pub fn type_name(&self) -> String {
        self.0.borrow().type_name.clone()
    }

    pub fn type_id(&self) -> TypeId {
        self.0.borrow().type_id
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
    pub models_by_name: IndexMap<String, TypeId>,
    pub relationships: IndexMap<String, Relationship>,
    pub typegen_cache: OnceCell<Weak<RefCell<HashMap<String, TypeId>>>>, // shared
    complete_registrations: IndexSet<TypeId>,
    counter: Cell<usize>,
}

impl PrismaContext {
    pub fn model(&self, type_id: TypeId) -> Result<ModelRef> {
        let model = self
            .models
            .get(&type_id)
            .ok_or_else(|| errors::unregistered_model(type_id))
            .unwrap(); // TODO ?

        Ok(model.clone())
    }

    pub fn is_registered(&self, candidate: &Candidate) -> bool {
        let model = candidate.model.borrow();
        self.models.contains_key(&model.type_id)
            && self.models_by_name.contains_key(&model.type_name)
            && model.relationships.contains_key(&candidate.field_name)
    }

    pub fn register_pair(&mut self, pair: CandidatePair) -> Result<bool> {
        match (self.is_registered(&pair.0), self.is_registered(&pair.1)) {
            (true, true) => Ok(false),
            (true, false) | (false, true) => {
                Err(format!("Pair partially registered: pair={pair:?}"))
            }
            (false, false) => {
                let id = self.next_id();
                let pair = pair.ordered()?;

                let rel_name = pair.rel_name(id)?;
                let CandidatePair(left, right) = pair;

                let relationship = Relationship {
                    name: rel_name.clone(),
                    left: RelationshipModel {
                        model_type: left.model.type_id(),
                        model_name: left.model.type_name(),
                        wrapper_type: left.property.wrapper_type_id,
                        cardinality: left.property.quantifier,
                        field: right.field_name.clone(),
                    },
                    right: RelationshipModel {
                        model_type: right.model.type_id(),
                        model_name: right.model.type_name(),
                        wrapper_type: right.property.wrapper_type_id,
                        cardinality: right.property.quantifier,
                        field: left.field_name.clone(),
                    },
                };

                self.relationships.insert(rel_name.clone(), relationship);

                {
                    let mut left_model = left.model.borrow_mut();
                    left_model
                        .relationships
                        .insert(right.field_name.clone(), rel_name.clone());
                }

                {
                    let mut right_model = right.model.borrow_mut();
                    right_model
                        .relationships
                        .insert(left.field_name.clone(), rel_name.clone());
                }

                Ok(true)
            }
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
        let model_id = root_model_id;
        if let Entry::Vacant(e) = self.models.entry(model_id) {
            let model: ModelRef = Rc::new(RefCell::new(model_id.try_into()?)).into();
            e.insert(model.clone());

            let mut res = vec![model_id];

            // register related models
            {
                let model = model.borrow();
                for model_id in model.iter_related_models() {
                    res.extend(self.register_models(model_id)?);
                }
            }

            Ok(res)
        } else {
            Ok(vec![])
        }
    }

    fn next_id(&self) -> usize {
        let id = self.counter.get() + 1;
        self.counter.set(id);
        id
    }

    pub fn convert(
        &self,
        ctx: &mut TypegraphContext,
        runtime_idx: u32,
        data: Rc<wit::PrismaRuntimeData>,
    ) -> Result<cm::PrismaRuntimeData> {
        Ok(cm::PrismaRuntimeData {
            name: data.name.clone(),
            connection_string_secret: data.connection_string_secret.clone(),
            models: self
                .models
                .keys()
                .cloned()
                .map(|id| -> Result<_> { Ok(ctx.register_type(id, Some(runtime_idx))?.into()) })
                .collect::<Result<Vec<_>>>()?,
            relationships: {
                self.relationships
                    .iter()
                    .map(|(_, rel)| {
                        let left =
                            self.convert_relationship_model(ctx, rel.left.clone(), runtime_idx)?;
                        let right =
                            self.convert_relationship_model(ctx, rel.right.clone(), runtime_idx)?;
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
        runtime_idx: u32,
    ) -> Result<cm::RelationshipModel> {
        Ok(cm::RelationshipModel {
            type_idx: ctx
                .register_type(model.model_type, Some(runtime_idx))?
                .into(),
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
                let model = model.borrow();
                (model.type_id, model.type_name.clone())
            })
            .collect();

        assert_eq!(
            models,
            vec![
                (user, user.type_name()?.unwrap()),
                (profile, profile.type_name()?.unwrap())
            ]
        );

        Ok(())
    }

    #[test]
    fn test_relationship_registration() -> Result<()> {
        let mut ctx = PrismaContext::default();
        let (user, post) = models::simple_relationship()?;

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
