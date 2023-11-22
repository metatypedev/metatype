// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::collections::HashMap;

use indexmap::IndexMap;
#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::{EffectType, PolicyIndices};

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SingleValue<T> {
    pub value: T,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(untagged)]
pub enum InjectionData<T> {
    SingleValue(SingleValue<T>),
    ValueByEffect(HashMap<EffectType, T>),
}

impl<T> InjectionData<T> {
    pub fn values(&self) -> Vec<&T> {
        match self {
            InjectionData::SingleValue(v) => vec![&v.value],
            InjectionData::ValueByEffect(m) => m.values().collect(),
        }
    }

    pub fn values_mut(&mut self) -> Vec<&mut T> {
        match self {
            InjectionData::SingleValue(v) => vec![&mut v.value],
            InjectionData::ValueByEffect(m) => m.values_mut().collect(),
        }
    }
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "source", content = "data", rename_all = "lowercase")]
pub enum Injection {
    Static(InjectionData<String>),
    Context(InjectionData<String>),
    Secret(InjectionData<String>),
    Parent(InjectionData<u32>),
    Dynamic(InjectionData<String>),
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TypeNodeBase {
    pub title: String,
    pub runtime: u32,
    pub policies: Vec<PolicyIndices>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub injection: Option<Injection>,
    #[serde(default, rename = "enum")]
    pub enumeration: Option<Vec<String>>, // JSON-serialized values
    #[serde(default)]
    pub config: IndexMap<String, serde_json::Value>,
    pub as_id: bool,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OptionalTypeData {
    pub item: u32,
    #[serialize_always]
    pub default_value: Option<serde_json::Value>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FloatTypeData {
    pub minimum: Option<f64>,
    pub maximum: Option<f64>,
    pub exclusive_minimum: Option<f64>,
    pub exclusive_maximum: Option<f64>,
    pub multiple_of: Option<f64>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IntegerTypeData {
    // we use i32 as GraphQL spec only support 32-bit integers (Int)
    pub minimum: Option<i32>,
    pub maximum: Option<i32>,
    pub exclusive_minimum: Option<i32>,
    pub exclusive_maximum: Option<i32>,
    pub multiple_of: Option<i32>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "kebab-case")]
pub enum StringFormat {
    Uuid,
    Email,
    Uri,
    Json,
    Hostname,
    Ean,
    Date,
    DateTime,
    // Path,
    Phone,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StringTypeData {
    pub min_length: Option<u32>,
    pub max_length: Option<u32>,
    pub pattern: Option<String>,
    pub format: Option<StringFormat>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileTypeData {
    pub min_size: Option<u32>,
    pub max_size: Option<u32>,
    pub mime_types: Option<Vec<String>>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ObjectTypeData {
    pub properties: IndexMap<String, u32>,
    #[serde(default)]
    pub required: Vec<String>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ListTypeData {
    pub items: u32,
    pub max_items: Option<u32>,
    pub min_items: Option<u32>,
    pub unique_items: Option<bool>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FunctionTypeData {
    pub input: u32,
    pub output: u32,
    pub materializer: u32,
    #[serialize_always]
    pub rate_weight: Option<u32>,
    pub rate_calls: bool,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UnionTypeData {
    /// Array of indexes of the nodes that are used as subschemes in the
    /// anyOf field of JSON Schema.
    pub any_of: Vec<u32>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EitherTypeData {
    /// Array of indexes of the nodes that are used as subschemes in the
    /// oneOf field of JSON Schema.
    pub one_of: Vec<u32>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum TypeNode {
    Optional {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: OptionalTypeData,
    },
    Boolean {
        #[serde(flatten)]
        base: TypeNodeBase,
    },
    Float {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: FloatTypeData,
    },
    Integer {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: IntegerTypeData,
    },
    String {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: StringTypeData,
    },
    File {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: FileTypeData,
    },
    Object {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: ObjectTypeData,
    },
    List {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: ListTypeData,
    },
    Function {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: FunctionTypeData,
    },
    Union {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: UnionTypeData,
    },
    #[serde(rename_all = "camelCase")]
    Either {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: EitherTypeData,
    },
    Any {
        #[serde(flatten)]
        base: TypeNodeBase,
    },
}

impl TypeNode {
    pub fn base(&self) -> &TypeNodeBase {
        use TypeNode::*;
        match self {
            Optional { base, .. }
            | Boolean { base, .. }
            | Float { base, .. }
            | Integer { base, .. }
            | String { base, .. }
            | File { base, .. }
            | Object { base, .. }
            | List { base, .. }
            | Function { base, .. }
            | Union { base, .. }
            | Either { base, .. }
            | Any { base, .. } => base,
        }
    }

    pub fn base_mut(&mut self) -> &mut TypeNodeBase {
        use TypeNode::*;
        match self {
            Optional { base, .. }
            | Boolean { base, .. }
            | Float { base, .. }
            | Integer { base, .. }
            | String { base, .. }
            | File { base, .. }
            | Object { base, .. }
            | List { base, .. }
            | Function { base, .. }
            | Union { base, .. }
            | Either { base, .. }
            | Any { base, .. } => base,
        }
    }

    pub fn type_name(&self) -> &'static str {
        use TypeNode::*;
        match self {
            Optional { .. } => "optional",
            Boolean { .. } => "boolean",
            Float { .. } => "number",
            Integer { .. } => "integer",
            String { .. } => "string",
            File { .. } => "file",
            Object { .. } => "object",
            List { .. } => "list",
            Function { .. } => "function",
            Union { .. } => "union",
            Either { .. } => "either",
            Any { .. } => "any",
        }
    }

    pub fn is_scalar(&self) -> bool {
        use TypeNode::*;
        matches!(
            self,
            Boolean { .. } | Float { .. } | Integer { .. } | String { .. }
        )
    }
}
