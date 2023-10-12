// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use indexmap::IndexMap;

use crate::errors::Result;
use crate::runtimes::prisma::errors;
use crate::runtimes::prisma::type_utils::RuntimeConfig;
use crate::types::{Type, TypeAttributes, TypeFun};
use crate::{runtimes::prisma::relationship::Cardinality, types::TypeId};

#[derive(Debug)]
pub struct Model {
    pub type_id: TypeId,
    pub type_name: String,
    pub props: IndexMap<String, Property>,
    // TODO Vec<String>
    pub id_field: String,
    // property -> relationship name
    pub relationships: IndexMap<String, String>,
}

impl TryFrom<TypeId> for Model {
    type Error = crate::wit::core::Error;

    fn try_from(type_id: TypeId) -> Result<Self> {
        let typ = type_id.as_struct()?;

        let props = typ
            .iter_props()
            .filter_map(|(k, type_id)| {
                Property::new(type_id)
                    .transpose()
                    .map(|p| p.map(|p| (k.to_string(), p)))
            })
            .collect::<Result<IndexMap<_, _>>>()?;

        let type_name = type_id
            .type_name()?
            .ok_or_else(|| errors::unnamed_model(&type_id.repr().unwrap()))?;

        let id_field = Self::find_id_field(&type_name, &props)?;

        Ok(Self {
            type_id,
            type_name,
            props,
            id_field,
            relationships: Default::default(), // populated later
        })
    }
}

impl Model {
    fn find_id_field(type_name: &str, props: &IndexMap<String, Property>) -> Result<String> {
        let id_fields = props
            .iter()
            .filter_map(|(k, p)| {
                if p.quantifier == Cardinality::One {
                    match &p.prop_type {
                        PropertyType::Scalar(s) => {
                            if s.type_id.as_type().unwrap().get_base().unwrap().as_id {
                                Some(k.clone())
                            } else {
                                None
                            }
                        }
                        _ => None,
                    }
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();

        match id_fields.len() {
            0 => Err(errors::id_field_not_found(type_name)),
            1 => Ok(id_fields.into_iter().next().unwrap()),
            _ => Err(errors::multiple_id_fields(type_name)),
        }
    }

    pub fn iter_props(&self) -> impl Iterator<Item = (&str, &Property)> {
        self.props.iter().map(|(k, p)| (k.as_str(), p))
    }

    pub fn iter_relationship_props(&self) -> impl Iterator<Item = (&str, RelationshipProperty)> {
        self.props.iter().filter_map(|(k, p)| {
            RelationshipProperty::try_from(p.clone())
                .ok()
                .map(|p| (k.as_str(), p))
        })
    }

    pub fn iter_related_models(&self) -> impl Iterator<Item = TypeId> + '_ {
        self.props.iter().filter_map(|(_, p)| match p.prop_type {
            PropertyType::Model { type_id, .. } => Some(type_id),
            _ => None,
        })
    }

    pub fn get_prop(&self, key: &str) -> Option<&Property> {
        self.props.get(key)
    }
}

#[derive(Debug, Clone, Default)]
pub struct RelationshipAttributes {
    pub name: Option<String>,
    pub target_field: Option<String>,
    pub fkey: Option<bool>,
    // pub unique: bool,
}

impl TryFrom<TypeAttributes> for RelationshipAttributes {
    type Error = crate::wit::core::Error;

    fn try_from(attrs: TypeAttributes) -> Result<Self> {
        let proxy_data = attrs.proxy_data;
        Ok(Self {
            name: proxy_data.get("rel_name").cloned(),
            target_field: proxy_data.get("target_field").cloned(),
            fkey: proxy_data
                .get("fkey")
                .map(|v| serde_json::from_str(v).map_err(|e| e.to_string()))
                .transpose()?,
            // unique: proxy_data.get("unique").map(|v| v.as_bool().unwrap()).unwrap_or(false),
        })
    }
}

#[derive(Debug, Clone)]
pub struct Property {
    // key: String,
    pub wrapper_type_id: TypeId,
    pub prop_type: PropertyType,
    // type_id: TypeId,
    quantifier: Cardinality,
    pub unique: bool,
    pub auto: bool,
}

impl Property {
    pub fn as_relationship_property(&self) -> Option<RelationshipProperty> {
        RelationshipProperty::try_from(self.clone()).ok()
    }

    pub fn as_scalar_property(&self) -> Option<ScalarProperty> {
        ScalarProperty::try_from(self.clone()).ok()
    }

    pub fn is_scalar(&self) -> bool {
        self.as_scalar_property().is_some()
    }
}

#[derive(Debug)]
pub struct RelationshipProperty {
    pub wrapper_type_id: TypeId,
    pub model_id: TypeId,
    pub quantifier: Cardinality,
    pub relationship_attributes: RelationshipAttributes,
    pub unique: bool,
}

impl TryFrom<Property> for RelationshipProperty {
    type Error = crate::wit::core::Error;

    fn try_from(prop: Property) -> Result<Self> {
        match prop.prop_type {
            PropertyType::Model {
                type_id,
                relationship_attributes,
            } => Ok(Self {
                wrapper_type_id: prop.wrapper_type_id,
                model_id: type_id,
                quantifier: prop.quantifier,
                relationship_attributes,
                unique: prop.unique,
            }),
            _ => Err("not a model".to_string()),
        }
    }
}

impl Property {
    fn new(wrapper_type_id: TypeId) -> Result<Option<Self>> {
        let attrs = wrapper_type_id.attrs()?;
        let typ = attrs.concrete_type.as_type()?;
        let runtime_config = RuntimeConfig::new(typ.get_base().unwrap().runtime_config.as_ref());
        let unique = runtime_config.get("unique")?.unwrap_or(false);
        let auto = runtime_config.get("auto")?.unwrap_or(false);
        // TODO
        // let fkey = false;
        match typ {
            Type::Func(_) => Ok(None), // other runtime
            Type::Optional(inner) => {
                // TODO injection??
                Ok(Some(Self {
                    wrapper_type_id,
                    prop_type: PropertyType::new(
                        TypeId(inner.data.of).attrs()?.concrete_type,
                        attrs,
                    )?,
                    quantifier: Cardinality::Optional,
                    auto,
                    unique,
                }))
            }
            Type::Array(inner) => {
                // TODO injection?
                Ok(Some(Self {
                    wrapper_type_id,
                    // prop_type: PropertyType::new(TypeId(inner.data.of).attrs()?)?,
                    prop_type: PropertyType::new(
                        TypeId(inner.data.of).attrs()?.concrete_type,
                        attrs,
                    )?,
                    quantifier: Cardinality::Many,
                    auto,
                    unique,
                }))
            }
            _ => Ok(Some(Self {
                wrapper_type_id,
                prop_type: PropertyType::new(attrs.concrete_type, attrs)?,
                quantifier: Cardinality::One,
                auto,
                unique,
            })),
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum StringType {
    Plain,
    #[allow(dead_code)]
    Uuid,
    #[allow(dead_code)]
    DateTime,
    // Enum??
}

#[derive(Debug, Clone)]
pub enum ScalarType {
    Integer,
    Float,
    Boolean,
    String(StringType),
}

#[derive(Debug, Clone)]
pub enum Injection {
    #[allow(dead_code)]
    Always,
    #[allow(dead_code)]
    PerEffect {
        create: bool,
        update: bool,
        delete: bool,
        none: bool,
    },
}

#[derive(Debug, Clone)]
pub struct Scalar {
    type_id: TypeId,
    typ: ScalarType,
    injection: Option<Injection>,
}

#[derive(Debug, Clone)]
pub struct ScalarProperty {
    pub wrapper_type_id: TypeId,
    pub type_id: TypeId,
    pub prop_type: ScalarType,
    pub injection: Option<Injection>,
    pub quantifier: Cardinality,
    pub unique: bool,
    pub auto: bool,
}

impl TryFrom<Property> for ScalarProperty {
    type Error = crate::wit::core::Error;

    fn try_from(prop: Property) -> Result<Self> {
        match prop.prop_type {
            PropertyType::Scalar(s) => Ok(Self {
                wrapper_type_id: prop.wrapper_type_id,
                type_id: s.type_id,
                prop_type: s.typ,
                injection: s.injection,
                quantifier: prop.quantifier,
                unique: prop.unique,
                auto: prop.auto,
            }),
            _ => Err("not a scalar".to_string()),
        }
    }
}

/// type without quantifier
#[derive(Debug, Clone)]
pub enum PropertyType {
    Scalar(Scalar),
    Model {
        type_id: TypeId,
        relationship_attributes: RelationshipAttributes,
    },
    // TODO Func
}

impl PropertyType {
    fn new(concrete_type: TypeId, wrapper_attrs: TypeAttributes) -> Result<Self> {
        match concrete_type.as_type()? {
            Type::Struct(_) => Ok(Self::Model {
                type_id: concrete_type,
                relationship_attributes: wrapper_attrs.try_into()?,
            }),
            Type::Optional(_) | Type::Array(_) => {
                Err("nested optional/list not supported".to_string())
            }
            Type::Integer(_) => Ok(Self::Scalar(Scalar {
                type_id: concrete_type,
                typ: ScalarType::Integer,
                injection: None,
            })),
            Type::Float(_) => Ok(Self::Scalar(Scalar {
                type_id: concrete_type,
                typ: ScalarType::Float,
                injection: None,
            })),
            Type::Boolean(_) => Ok(Self::Scalar(Scalar {
                type_id: concrete_type,
                typ: ScalarType::Boolean,
                injection: None,
            })),
            // TODO check format
            Type::String(_) => Ok(Self::Scalar(Scalar {
                type_id: concrete_type,
                typ: ScalarType::String(StringType::Plain),
                injection: None,
            })),
            _ => Err("unsupported property type".to_string()),
        }
    }
}
