// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use indexmap::IndexMap;
#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::{EffectType, PolicyIndices};

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InjectionCase {
    effect: EffectType,
    injection: InjectionSource,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase", tag = "source", content = "data")]
pub enum InjectionSource {
    Static(String),
    Context(String),
    Secret(String),
    Parent(u32),
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InjectionSwitch {
    pub cases: Vec<InjectionCase>,
    pub default: Option<InjectionSource>,
}

impl InjectionSwitch {
    pub fn sources(&self) -> impl Iterator<Item = &InjectionSource> {
        self.cases
            .iter()
            .map(|c| &c.injection)
            .chain(self.default.as_ref().into_iter())
    }

    pub fn cases(&self) -> impl Iterator<Item = (Option<EffectType>, &InjectionSource)> {
        self.cases
            .iter()
            .map(|c| (Some(c.effect), &c.injection))
            .chain(self.default.as_ref().map(|inj| (None, inj)))
    }
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
    pub injection: Option<InjectionSwitch>,
    #[serde(default, rename = "enum")]
    pub enumeration: Option<Vec<serde_json::Value>>,
    #[serde(default)]
    pub config: IndexMap<String, serde_json::Value>,
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
pub struct NumberTypeData {
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
    pub minimum: Option<i64>,
    pub maximum: Option<i64>,
    pub exclusive_minimum: Option<i64>,
    pub exclusive_maximum: Option<i64>,
    pub multiple_of: Option<i64>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StringTypeData {
    pub min_length: Option<u32>,
    pub max_length: Option<u32>,
    pub pattern: Option<String>,
    // TODO Option<Enum>
    pub format: Option<String>,
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
pub struct ArrayTypeData {
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
    Number {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: NumberTypeData,
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
    Object {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: ObjectTypeData,
    },
    Array {
        #[serde(flatten)]
        base: TypeNodeBase,
        #[serde(flatten)]
        data: ArrayTypeData,
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
            | Number { base, .. }
            | Integer { base, .. }
            | String { base, .. }
            | Object { base, .. }
            | Array { base, .. }
            | Function { base, .. }
            | Union { base, .. }
            | Either { base, .. }
            | Any { base, .. } => base,
        }
    }
}
