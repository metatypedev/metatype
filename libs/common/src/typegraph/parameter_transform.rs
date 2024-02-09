// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::collections::HashMap;

#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "source", rename_all = "lowercase")]
pub enum ParameterTransformLeafNode {
    Arg { name: String },
    Static { value_json: String },
    Secret { key: String },
    Context { key: String },
    Parent { type_idx: u32 },
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ParameterTransformParentNode {
    Object {
        fields: HashMap<String, ParameterTransformNode>,
    },
    Array {
        items: Vec<ParameterTransformNode>,
    },
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
    pub transform_root: HashMap<String, ParameterTransformNode>,
}
