use crate::{
    global_store::{Store, with_store},
    types::{Struct, Type},
    wit::core::TypeId,
};
use std::collections::{HashMap, HashSet};

pub struct Registry {
    // type_id => [ property => relationship ]
    models: HashMap<TypeId, HashMap<String, String>>,
    // relationship_name => relationship
    relationships: HashMap<String, Relationship>,
    model_ids: HashMap<String, TypeId>,
}

impl Registry {
    fn has(&self, model: TypeId, prop: &str) -> bool {
        self.models
            .get(&model)
            .map_or(false, |props| props.contains_key(prop))
    }
}

struct Relationship {
    name: String,
    left: RelationshipModel,
    right: RelationshipModel,
}

impl Relationship {
    fn from_side(side: RelationshipModel) -> Result<Relationship> {
        match side.cardinality {
            Cardinality::One => Self::from_one(side),
            _ => todo!(),
        }
    }

    fn from_one(store: &Store, source: RelationshipModel) -> Result<Relationship> {
        assert!(source.cardinality == Cardinality::One);

        let alternatives = RelationshipModel::find_targets(store, &source)?;

        match alternatives.size() {
            0 => Err(errors::relationship_not_found(store., source.field)),
            1 => {
                //
                todo!()
            }
            _ => {
                //
                todo!()
            }
        }
    }
}

#[derive(Clone, Copy)]
enum Cardinality {
    Optional,
    One,
    Many,
}

struct RelationshipModel {
    model: TypeId,
    field: String,
    cardinality: Cardinality,
}

impl RelationshipModel {
    fn find_targets(store: &Store, source: &RelathipshipModel) -> Result<Vec<RelationshipModel>> {
        todo!()
    }

    fn name(&self) -> Result<String> {
        with_store(|s| {
            let model = s.type_as_struct(self.model)?;
            if let Some(name) = &model.base.name {
                Ok(name.clone())
            } else {
                Ok(format!("object_{}", self.model))
            }
        })
    }
}

struct RelationshipDiscovery<'a> {
    registry: &'a Registry,
    store: &'a Store,
}

use crate::errors::Result;

impl<'a> RelationshipDiscovery<'a> {
    pub fn scan_model(&self, model: &'a Struct) -> Result<Vec<Relationship>> {
        let mut result = Vec::new();
        let mut self_relationships = HashSet::new();
        for (prop, ty) in &model.data.props.iter() {
            let ty = self.store.resolve_proxy(*ty)?;
            if self.registry.has(ty, prop) || self_relationships.contains(&ty) {
                continue;
            }
            match self.store.get_type(ty)? {
                Type::Struct(target_model) => {
                    let source = RelationshipModel {
                        model: target_model.id,
                        field: prop.to_string(),
                        cardinality: Cardinality::One,
                    };
                    if model.id == target_model.id {
                        // TODO
                        self_relationships.insert(ty);
                    } else {
                        result.push()
                    }
                }
            }
        }
        result
    }
}
