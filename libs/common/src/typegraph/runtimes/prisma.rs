// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MigrationOptions {
    pub migration_files: Option<String>,
    // enable migration creation
    // otherwise, a non-empty diff will make the push fail
    pub create: bool,
    // reset the database if required
    pub reset: bool,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Cardinality {
    Optional, // 0..1
    One,      // 1..1
    Many,     // 0..*
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RelationshipModel {
    pub type_idx: u32,
    // field of this model pointing to the other model
    // ? what about multi-field relationships?
    pub field: String,
    pub cardinality: Cardinality,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Relationship {
    name: String,
    left: RelationshipModel,
    right: RelationshipModel,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PrismaRuntimeData {
    pub name: String,
    // pub datamodel: Option<String>, // to be set by a hook on the typegate
    pub connection_string_secret: String,
    pub models: Vec<u32>,
    pub relationships: Vec<Relationship>,
    // if migration_options is not None: migrations will be applied on push
    #[serde(default)]
    pub migration_options: Option<MigrationOptions>,
}
