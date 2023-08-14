use crate::wit::core::TypeId;

mod discovery;
mod registry;

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub enum Cardinality {
    Optional,
    One,
    Many,
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct RelationshipModel {
    pub model: TypeId,
    pub field: String,
    pub cardinality: Cardinality,
}

pub struct Relationship {
    pub name: String,
    pub left: RelationshipModel,
    pub right: RelationshipModel,
}

use registry::RelationshipRegistry;
