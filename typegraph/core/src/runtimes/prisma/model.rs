// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub use common::typegraph::runtimes::prisma::{ScalarType, StringType};
use common::typegraph::{EffectType, InjectionData};
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
            .map(|(k, type_id)| Property::new(type_id).map(|p| (k.to_string(), p)))
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
            .filter_map(|(k, p)| match p {
                Property::Scalar(prop) => match prop.quantifier {
                    Cardinality::One => prop
                        .type_id
                        .as_type()
                        .unwrap()
                        .get_base()
                        .unwrap()
                        .as_id
                        .then(|| k.clone()),
                    _ => None,
                },
                _ => None,
            })
            .collect::<Vec<_>>();

        match id_fields.len() {
            0 => Err(errors::id_field_not_found(type_name)),
            1 => Ok(id_fields.into_iter().next().unwrap()),
            _ => Err(errors::multiple_id_fields(type_name)),
        }
    }

    pub fn iter_props(&self) -> impl Iterator<Item = (&String, &Property)> {
        self.props.iter()
    }

    pub fn iter_relationship_props(&self) -> impl Iterator<Item = (&str, &RelationshipProperty)> {
        self.props.iter().filter_map(|(k, p)| match p {
            Property::Model(p) => Some((k.as_str(), p)),
            _ => None,
        })
    }

    pub fn iter_related_models(&self) -> impl Iterator<Item = TypeId> + '_ {
        self.props.iter().filter_map(|(_, p)| match p {
            Property::Model(p) => Some(p.model_id),
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
        })
    }
}

#[derive(Debug, Clone)]
pub enum Property {
    Scalar(ScalarProperty),
    Model(RelationshipProperty),
    Unmanaged(TypeId),
}

#[derive(Debug, Clone)]
pub struct RelationshipProperty {
    pub wrapper_type_id: TypeId,
    pub model_id: TypeId,
    pub quantifier: Cardinality,
    pub relationship_attributes: RelationshipAttributes,
    pub unique: bool,
}

impl Property {
    fn new(wrapper_type_id: TypeId) -> Result<Self> {
        let attrs = wrapper_type_id.attrs()?;
        let typ = attrs.concrete_type.as_type()?;
        let runtime_config = RuntimeConfig::new(typ.get_base().unwrap().runtime_config.as_ref());
        let unique = runtime_config.get("unique")?.unwrap_or(false);
        let auto = runtime_config.get("auto")?.unwrap_or(false);
        let (type_id, card) = match typ {
            Type::Optional(inner) => (
                TypeId(inner.data.of).attrs()?.concrete_type,
                Cardinality::Optional,
            ),
            Type::Array(inner) => (
                TypeId(inner.data.of).attrs()?.concrete_type,
                Cardinality::Many,
            ),
            _ => (attrs.concrete_type, Cardinality::One),
        };

        let scalar = |typ, injection| {
            Self::Scalar(ScalarProperty {
                wrapper_type_id,
                type_id,
                prop_type: typ,
                injection,
                quantifier: card,
                unique,
                auto,
            })
        };

        match attrs
            .injection
            .as_ref()
            .map(Injection::try_from)
            .transpose()
        {
            Ok(injection) => match type_id.as_type()? {
                Type::Struct(_) => {
                    if injection.is_some() {
                        return Err("injection not supported for models".to_string().into());
                    }
                    Ok(Self::Model(RelationshipProperty {
                        wrapper_type_id,
                        model_id: type_id,
                        quantifier: card,
                        relationship_attributes: RelationshipAttributes::try_from(attrs)?,
                        unique,
                    }))
                }
                Type::Optional(_) | Type::Array(_) => {
                    Err("nested optional/list not supported".into())
                }
                Type::Integer(_) => Ok(scalar(ScalarType::Integer, injection)),
                Type::Float(_) => Ok(scalar(ScalarType::Float, injection)),
                Type::Boolean(_) => Ok(scalar(ScalarType::Boolean, injection)),
                Type::String(inner) => Ok(scalar(
                    ScalarType::String {
                        format: match inner.data.format.as_deref() {
                            Some("uuid") => StringType::Uuid,
                            Some("date-time") => StringType::DateTime,
                            _ => StringType::Plain,
                        },
                    },
                    injection,
                )),
                Type::Func(_) => {
                    if injection.is_some() {
                        Err("injection not supported for function type".into())
                    } else {
                        Ok(Self::Unmanaged(wrapper_type_id))
                    }
                }
                _ => Err("unsupported property type".into()),
            },
            Err(_) => match type_id.as_type()? {
                Type::Func(_) => Err("injection not supported on t::struct()".into()),
                Type::Optional(_) | Type::Array(_) => {
                    Err("nested optional/list not supported".into())
                }
                Type::Struct(_)
                | Type::String(_)
                | Type::Integer(_)
                | Type::Float(_)
                | Type::Boolean(_) => Ok(Self::Unmanaged(wrapper_type_id)),
                _ => Err("unsupported property type".into()),
            },
        }
    }
}

#[derive(Debug, Clone)]
pub enum InjectionHandler {
    Typegate,
    PrismaDateNow,
}

#[derive(Debug, Clone)]
pub struct Injection {
    pub create: Option<InjectionHandler>,
    pub update: Option<InjectionHandler>,
}

impl Injection {
    /// return None if the injection implies that the property is unmanaged.
    /// Unmanaged properties are properties that will not be present in the
    /// prisma model.
    fn convert_injection<T>(data: &InjectionData<T>) -> Option<Self> {
        match data {
            InjectionData::SingleValue(_) => None, // unmanaged
            InjectionData::ValueByEffect(map) => {
                if map.contains_key(&EffectType::Read) {
                    // TODO check if other effects are present??
                    None
                } else {
                    Some(Self {
                        create: map
                            .get(&EffectType::Create)
                            .map(|_| InjectionHandler::Typegate),
                        update: map
                            .get(&EffectType::Update)
                            .map(|_| InjectionHandler::Typegate),
                    })
                }
            }
        }
    }

    fn convert_dynamic_injection(data: &InjectionData<String>) -> Option<Self> {
        match data {
            InjectionData::SingleValue(_) => None, // unmanaged
            InjectionData::ValueByEffect(map) => {
                if map.contains_key(&EffectType::Read) {
                    // TODO check if other effects are present??
                    None
                } else {
                    Some(Self {
                        create: map.get(&EffectType::Create).and_then(|i| match i.as_str() {
                            "now" => Some(InjectionHandler::PrismaDateNow),
                            _ => None,
                        }),
                        update: map.get(&EffectType::Update).and_then(|i| match i.as_str() {
                            "now" => Some(InjectionHandler::PrismaDateNow),
                            _ => None,
                        }),
                    })
                }
            }
        }
    }
}

impl TryFrom<&common::typegraph::Injection> for Injection {
    // unmanaged property
    type Error = ();

    fn try_from(injection: &common::typegraph::Injection) -> Result<Self, Self::Error> {
        use common::typegraph::Injection as I;

        match injection {
            I::Static(inj) | I::Secret(inj) | I::Context(inj) => {
                Self::convert_injection(inj).ok_or(())
            }
            I::Parent(inj) => Self::convert_injection(inj).ok_or(()),
            I::Dynamic(inj) => Self::convert_dynamic_injection(inj).ok_or(()),
        }
    }
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
