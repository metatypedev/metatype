// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MigrationOptions {
    pub migration_files: Option<String>,
    // enable migration creation
    // otherwise, a non-empty diff will make the push fail
    pub create: bool,
    // reset the database if required
    pub reset: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Cardinality {
    Optional, // 0..1
    One,      // 1..1
    Many,     // 0..*
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RelationshipModel {
    pub type_idx: u32,
    // field of this model pointing to the other model
    // ? what about multi-field relationships?
    pub field: String,
    pub cardinality: Cardinality,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Relationship {
    pub name: String,
    pub left: RelationshipModel,
    pub right: RelationshipModel,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum Injection {
    DateNow,
    // TODO other dynamic injection?
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ManagedInjection {
    pub create: Option<Injection>,
    pub update: Option<Injection>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum StringType {
    Plain,
    Uuid,
    DateTime,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type")]
pub enum ScalarType {
    Boolean,
    #[serde(rename = "Int")]
    Integer,
    Float,
    String {
        format: StringType,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ScalarProperty {
    pub key: String,
    pub prop_type: ScalarType,
    pub cardinality: Cardinality,
    pub type_idx: u32,
    pub injection: Option<ManagedInjection>,
    pub unique: bool,
    pub auto: bool,
    pub default_value: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Side {
    Left,
    Right,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipProperty {
    pub key: String,
    pub cardinality: Cardinality,
    pub type_idx: u32,
    pub model_name: String,
    pub unique: bool,
    pub relationship_name: String,
    pub relationship_side: Side,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Property {
    Scalar(ScalarProperty),
    Relationship(RelationshipProperty),
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Model {
    pub type_idx: u32,
    pub type_name: String,
    pub props: Vec<Property>,
    pub id_fields: Vec<String>,
    pub unique_constraints: Vec<Vec<String>>,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct PrismaRuntimeData {
    pub name: String,
    pub connection_string_secret: String,
    pub models: Vec<Model>,
    pub relationships: Vec<Relationship>,
    // if migration_options is not None: migrations will be applied on push
    #[serde(default)]
    pub migration_options: Option<MigrationOptions>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PrismaOperationMatData {
    pub table: String,
    pub operation: String,
    pub ordered_keys: Option<Vec<String>>,
}
