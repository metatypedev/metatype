// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub use common::typegraph::runtimes::prisma::{ScalarType, StringType};
use common::typegraph::{EffectType, InjectionData};
use indexmap::IndexMap;

use crate::errors::Result;
use crate::runtimes::prisma::errors;
use crate::runtimes::prisma::type_utils::RuntimeConfig;
use crate::types::type_ref::RefData;
use crate::types::{TypeDef, TypeDefExt};
use crate::validation::types::validate_value;
use crate::{runtimes::prisma::relationship::Cardinality, types::TypeId};

use super::constraints::{find_id_fields, get_struct_level_unique_constraints};

#[derive(Debug)]
pub struct Model {
    pub type_id: TypeId,
    pub type_name: String,
    pub props: IndexMap<String, Property>,
    pub id_fields: Vec<String>,
    pub unique_constraints: Vec<Vec<String>>,
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
            .name()?
            .ok_or_else(|| errors::unnamed_model(&type_id.repr().unwrap()))?;

        let config = RuntimeConfig::new(typ.base().runtime_config.as_ref());

        let id_fields = find_id_fields(&type_name, &props, &config)?;
        let unique_constraints = get_struct_level_unique_constraints(&type_name, &config)?;

        Ok(Self {
            type_id,
            type_name,
            props,
            id_fields,
            unique_constraints,
            relationships: Default::default(), // populated later
        })
    }
}

impl Model {
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

impl RelationshipAttributes {
    pub fn new(ref_data: Option<&RefData>) -> Result<Self> {
        let Some(ref_data) = ref_data else {
            return Ok(Self::default());
        };

        let attrs = &ref_data.attributes;

        Ok(Self {
            name: attrs.get("rel_name").cloned(),
            target_field: attrs.get("target_field").cloned(),
            fkey: attrs
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
        let (ref_data, type_def) = wrapper_type_id.resolve_ref()?;
        let runtime_config = RuntimeConfig::new(type_def.base().runtime_config.as_ref());
        let unique = if matches!(type_def, TypeDef::Struct(_)) {
            // the unique config is used to specify struct-level unique constraints on structs
            false
        } else {
            runtime_config.get("unique")?.unwrap_or(false)
        };
        let auto = runtime_config.get("auto")?.unwrap_or(false);
        let default_value = runtime_config.get("default")?;
        if let Some(default_value) = default_value.as_ref() {
            validate_value(
                default_value,
                wrapper_type_id,
                "<default value>".to_string(),
            )?;
        }

        let (inner_type_def, card) = match &type_def {
            TypeDef::Optional(ref inner) => (
                TypeId(inner.data.of).resolve_ref()?.1,
                Cardinality::Optional,
            ),
            TypeDef::List(inner) => (TypeId(inner.data.of).resolve_ref()?.1, Cardinality::Many),
            _ => (type_def.clone(), Cardinality::One),
        };

        let scalar = |typ, injection| {
            Self::Scalar(ScalarProperty {
                wrapper_type_id,
                type_id: inner_type_def.id(),
                prop_type: typ,
                injection,
                quantifier: card,
                unique,
                auto,
                default_value,
            })
        };

        match type_def
            .x_base()
            .injection
            .as_ref()
            .map(|i| i.as_ref())
            .map(Injection::try_from)
            .transpose()
        {
            Ok(injection) => match &inner_type_def {
                TypeDef::Struct(_) => {
                    if injection.is_some() {
                        return Err("injection not supported for models".to_string().into());
                    }
                    Ok(Self::Model(RelationshipProperty {
                        wrapper_type_id,
                        model_id: inner_type_def.id(),
                        quantifier: card,
                        relationship_attributes: RelationshipAttributes::new(ref_data.as_ref())?,
                        unique,
                    }))
                }
                TypeDef::Optional(_) | TypeDef::List(_) => {
                    Err("nested optional/list not supported".into())
                }
                TypeDef::Integer(_) => Ok(scalar(ScalarType::Integer, injection)),
                TypeDef::Float(_) => Ok(scalar(ScalarType::Float, injection)),
                TypeDef::Boolean(_) => Ok(scalar(ScalarType::Boolean, injection)),
                TypeDef::String(inner) => Ok(scalar(
                    ScalarType::String {
                        format: match inner.data.format.as_deref() {
                            Some("uuid") => StringType::Uuid,
                            Some("date-time") => StringType::DateTime,
                            _ => StringType::Plain,
                        },
                    },
                    injection,
                )),
                TypeDef::Func(_) => {
                    if injection.is_some() {
                        Err("injection not supported for function type".into())
                    } else {
                        Ok(Self::Unmanaged(wrapper_type_id))
                    }
                }
                _ => Err("unsupported property type".into()),
            },
            Err(_) => match inner_type_def {
                TypeDef::Func(_) => Err("injection not supported on t::struct()".into()),
                TypeDef::Optional(_) | TypeDef::List(_) => {
                    Err("nested optional/list not supported".into())
                }
                TypeDef::Struct(_)
                | TypeDef::String(_)
                | TypeDef::Integer(_)
                | TypeDef::Float(_)
                | TypeDef::Boolean(_) => Ok(Self::Unmanaged(wrapper_type_id)),
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
    pub default_value: Option<serde_json::Value>,
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};

    impl Property {
        fn as_scalar(&self) -> Option<&ScalarProperty> {
            match self {
                Property::Scalar(s) => Some(s),
                _ => None,
            }
        }
    }

    #[test]
    fn test_injection() -> Result<()> {
        let type1 = t::struct_()
            .propx("one", t::string().as_id(true))?
            .propx("two", t::string().set_value("Hello".to_string()))?
            .named("A")
            .build()?;
        let model = Model::try_from(type1)?;

        let one = model.props.get("one");
        assert!(matches!(model.props.get("one"), Some(Property::Scalar(_))));
        let one = one.unwrap().as_scalar().unwrap();
        assert!(one.injection.is_none());

        assert!(matches!(
            model.props.get("two"),
            Some(Property::Unmanaged(_))
        ));

        Ok(())
    }
}
