// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::BTreeMap;

use anyhow::Result;
use indexmap::IndexMap;
use ordered_float::NotNan;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;
use std::hash::Hash;

use super::{parameter_transform::FunctionParameterTransform, EffectType, PolicyIndices};

// TODO: consider exploring interning
pub type TypeName = String;
pub type TypeId = u32;

type JsonValue = serde_json::Value;

#[derive(Serialize, Deserialize, Clone, Debug, Hash, PartialEq, Eq)]
pub struct SingleValue {
    pub value: JsonValue,
}

#[derive(Serialize, Deserialize, Clone, Debug, Hash, PartialEq, Eq)]
#[serde(untagged)]
pub enum InjectionData {
    SingleValue(SingleValue),
    ValueByEffect(BTreeMap<EffectType, JsonValue>),
}

impl InjectionData {
    pub fn values<T: serde::de::DeserializeOwned>(&self) -> Result<Vec<T>> {
        match self {
            InjectionData::SingleValue(v) => Ok(vec![serde_json::from_value(v.value.clone())?]),
            InjectionData::ValueByEffect(m) => m
                .values()
                .map(|v| serde_json::from_value(v.clone()).map_err(Into::into))
                .collect(),
        }
    }

    pub fn values_mut(&mut self) -> Vec<&mut JsonValue> {
        match self {
            InjectionData::SingleValue(v) => vec![&mut v.value],
            InjectionData::ValueByEffect(m) => m.values_mut().collect(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, Hash, PartialEq, Eq)]
#[serde(tag = "source", content = "data", rename_all = "lowercase")]
pub enum Injection {
    Static(InjectionData),
    Context(InjectionData),
    Secret(InjectionData),
    Parent(InjectionData),
    Dynamic(InjectionData),
    Random(InjectionData),
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TypeNodeBase {
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default, rename = "enum")]
    pub enumeration: Option<Vec<String>>, // JSON-serialized values
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OptionalTypeData<Id = TypeId> {
    pub item: Id,
    #[serialize_always]
    pub default_value: Option<serde_json::Value>,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug, Hash)]
#[serde(rename_all = "camelCase")]
pub struct FloatTypeData {
    pub minimum: Option<NotNan<f64>>,
    pub maximum: Option<NotNan<f64>>,
    pub exclusive_minimum: Option<NotNan<f64>>,
    pub exclusive_maximum: Option<NotNan<f64>>,
    pub multiple_of: Option<NotNan<f64>>,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug, Hash)]
#[serde(rename_all = "camelCase")]
pub struct IntegerTypeData {
    // we use i32 as GraphQL spec only support 32-bit integers (Int)
    pub minimum: Option<i32>,
    pub maximum: Option<i32>,
    pub exclusive_minimum: Option<i32>,
    pub exclusive_maximum: Option<i32>,
    pub multiple_of: Option<i32>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Hash)]
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
    Phone,
}

impl core::fmt::Display for StringFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        use StringFormat::*;
        match self {
            Uuid => write!(f, "uuid"),
            Email => write!(f, "email"),
            Uri => write!(f, "uri"),
            Json => write!(f, "json"),
            Hostname => write!(f, "hostname"),
            Ean => write!(f, "ean"),
            Date => write!(f, "date"),
            DateTime => write!(f, "date_time"),
            Phone => write!(f, "phone"),
        }
    }
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug, Hash)]
#[serde(rename_all = "camelCase")]
pub struct StringTypeData {
    pub min_length: Option<u32>,
    pub max_length: Option<u32>,
    pub pattern: Option<String>,
    pub format: Option<StringFormat>,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug, Hash)]
#[serde(rename_all = "camelCase")]
pub struct FileTypeData {
    pub min_size: Option<u32>,
    pub max_size: Option<u32>,
    pub mime_types: Option<Vec<String>>,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ObjectTypeData<Id = TypeId> {
    pub properties: IndexMap<String, Id>,
    pub id: Vec<String>,
    #[serde(default)]
    pub required: Vec<String>,
    #[serde(skip_serializing_if = "IndexMap::is_empty")]
    #[serde(default)]
    pub policies: IndexMap<String, Vec<PolicyIndices>>,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    #[serde(default)]
    pub additional_props: bool,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ListTypeData<Id = TypeId> {
    pub items: Id,
    pub max_items: Option<u32>,
    pub min_items: Option<u32>,
    pub unique_items: Option<bool>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(untagged)]
pub enum InjectionNode {
    Parent {
        children: BTreeMap<String, InjectionNode>,
    },
    Leaf {
        injection: Injection,
    },
}

impl InjectionNode {
    pub fn is_empty(&self) -> bool {
        match self {
            InjectionNode::Parent { children } => children.values().all(InjectionNode::is_empty),
            InjectionNode::Leaf { .. } => false,
        }
    }
}

impl InjectionNode {
    pub fn collect_secrets_into(&self, collector: &mut Vec<String>) -> Result<()> {
        match self {
            InjectionNode::Leaf { injection } => {
                if let Injection::Secret(d) = injection {
                    collector.extend(d.values::<String>()?);
                }
            }
            InjectionNode::Parent { children } => {
                for child in children.values() {
                    child.collect_secrets_into(collector)?;
                }
            }
        }
        Ok(())
    }
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FunctionTypeData<Id = TypeId> {
    pub input: Id,
    #[serde(rename = "parameterTransform")]
    pub parameter_transform: Option<FunctionParameterTransform>,
    pub output: Id,
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[serde(default)]
    pub injections: BTreeMap<String, InjectionNode>,
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[serde(default)]
    pub outjections: BTreeMap<String, InjectionNode>,
    #[serde(rename = "runtimeConfig")]
    pub runtime_config: serde_json::Value,
    pub materializer: u32,
    #[serialize_always]
    pub rate_weight: Option<u32>,
    pub rate_calls: bool,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UnionTypeData<Id = TypeId> {
    /// Array of indexes of the nodes that are used as subschemes in the
    /// anyOf field of JSON Schema.
    pub any_of: Vec<Id>,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EitherTypeData<Id = TypeId> {
    /// Array of indexes of the nodes that are used as subschemes in the
    /// oneOf field of JSON Schema.
    pub one_of: Vec<Id>,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum TypeNode<Id = TypeId> {
    Optional {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: OptionalTypeData<Id>,
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
        data: ObjectTypeData<Id>,
    },
    List {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: ListTypeData<Id>,
    },
    Function {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: FunctionTypeData<Id>,
    },
    Union {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: UnionTypeData<Id>,
    },
    #[serde(rename_all = "camelCase")]
    Either {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: EitherTypeData<Id>,
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
            Float { .. } => "float",
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

    pub fn children(&self) -> Result<Vec<TypeId>> {
        use TypeNode::*;
        match self {
            Optional { data, .. } => Ok(vec![data.item]),
            Object { data, .. } => Ok(data.properties.values().cloned().collect()),
            List { data, .. } => Ok(vec![data.items]),
            Function { data, .. } => Ok(vec![data.input, data.output]),
            Union { data, .. } => Ok(data.any_of.clone()),
            Either { data, .. } => Ok(data.one_of.clone()),
            _ => Ok(vec![]),
        }
    }
}
