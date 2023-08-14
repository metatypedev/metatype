// use super::errors;
use crate::{errors::Result, global_store::with_store, types::Type, wit::core::TypeId};
use std::collections::HashMap;

use super::{Relationship, RelationshipModel};

pub struct RelationshipRegistry {
    // type_id => [ property => relationship ]
    models: HashMap<TypeId, HashMap<String, String>>,
    // relationship_name => relationship
    relationships: HashMap<String, Relationship>,
    model_ids: HashMap<String, TypeId>,
}

impl RelationshipRegistry {
    pub fn has(&self, model: TypeId, prop: &str) -> bool {
        self.models
            .get(&model)
            .map_or(false, |props| props.contains_key(prop))
    }
}
