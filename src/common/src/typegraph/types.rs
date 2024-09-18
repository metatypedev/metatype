// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::collections::BTreeMap;

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;
use std::hash::Hash;

use super::{parameter_transform::FunctionParameterTransform, EffectType, PolicyIndices};

// TODO: consider exploring interning
pub type TypeName = String;
pub type TypeId = u32;

#[derive(Serialize, Deserialize, Clone, Debug, Hash)]
pub struct SingleValue<T: Hash> {
    pub value: T,
}

#[derive(Serialize, Deserialize, Clone, Debug, Hash)]
#[serde(untagged)]
pub enum InjectionData<T: Hash> {
    SingleValue(SingleValue<T>),
    ValueByEffect(BTreeMap<EffectType, T>),
}

impl<T: Hash> InjectionData<T> {
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

#[derive(Serialize, Deserialize, Clone, Debug, Hash)]
#[serde(tag = "source", content = "data", rename_all = "lowercase")]
pub enum Injection {
    Static(InjectionData<String>),
    Context(InjectionData<String>),
    Secret(InjectionData<String>),
    Parent(InjectionData<u32>),
    Dynamic(InjectionData<String>),
    Random(InjectionData<String>),
}

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

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OptionalTypeData<Id = TypeId> {
    pub item: Id,
    #[serialize_always]
    pub default_value: Option<serde_json::Value>,
}

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

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
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
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StringTypeData {
    pub min_length: Option<u32>,
    pub max_length: Option<u32>,
    pub pattern: Option<String>,
    pub format: Option<StringFormat>,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileTypeData {
    pub min_size: Option<u32>,
    pub max_size: Option<u32>,
    pub mime_types: Option<Vec<String>>,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ObjectTypeData<Id = TypeId> {
    pub properties: IndexMap<String, Id>,
    #[serde(default)]
    pub required: Vec<String>,
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

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FunctionTypeData<Id = TypeId> {
    pub input: Id,
    #[serde(rename = "parameterTransform")]
    pub parameter_transform: Option<FunctionParameterTransform>,
    pub output: Id,
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
