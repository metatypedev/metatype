// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "source", rename_all = "lowercase")]
pub enum ParameterTransformLeafNode {
    #[serde(rename_all = "camelCase")]
    Arg { name: String },
    #[serde(rename_all = "camelCase")]
    Static { value_json: String },
    #[serde(rename_all = "camelCase")]
    Secret { key: String },
    #[serde(rename_all = "camelCase")]
    Context { key: String },
    #[serde(rename_all = "camelCase")]
    Parent { parent_idx: u32 },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ParameterTransformParentNode {
    #[serde(rename_all = "camelCase")]
    Object {
        fields: HashMap<String, ParameterTransformNode>,
    },
    #[serde(rename_all = "camelCase")]
    Array { items: Vec<ParameterTransformNode> },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(untagged)]
pub enum ParameterTransformNodeData {
    Leaf(ParameterTransformLeafNode),
    Parent(ParameterTransformParentNode),
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ParameterTransformNode {
    pub type_idx: u32,
    // #[serde(flatten)]
    pub data: ParameterTransformNodeData,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FunctionParameterTransform {
    pub resolver_input: u32,
    pub transform_root: ParameterTransformNode,
}
