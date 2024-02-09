// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::collections::HashMap;

#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ApplyFromArg {
    pub name: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ApplyFromStatic {
    #[serde(rename = "valueJson")]
    pub value_json: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ApplyFromSecret {
    pub key: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ApplyFromContext {
    pub key: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ApplyFromParent {
    pub name: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "source")]
pub enum ParameterTransformLeafNode {
    Arg(ApplyFromArg),
    Static(ApplyFromStatic),
    Secret(ApplyFromSecret),
    Context(ApplyFromContext),
    Parent(ApplyFromParent),
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ParameterTransformObjectNode {
    pub fields: HashMap<String, ParameterTransformNode>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ParameterTransformArrayNode {
    pub items: Vec<ParameterTransformNode>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type")]
pub enum ParameterTransformParentNode {
    Object(ParameterTransformObjectNode),
    Array(ParameterTransformArrayNode),
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(untagged)]
pub enum ParameterTransformNode {
    Leaf(ParameterTransformLeafNode),
    Parent(ParameterTransformParentNode),
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FunctionParameterTransform {
    pub resolver_input: u32,
    pub transform_root: ParameterTransformObjectNode,
}
