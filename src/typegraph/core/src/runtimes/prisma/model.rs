// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::constraints::get_struct_level_unique_constraints;
use super::relationship::PrismaRefData;
use crate::errors::{ErrorContext as _, Result, TgError};
use crate::global_store::Store;
use crate::runtimes::prisma::errors;
use crate::runtimes::prisma::type_utils::RuntimeConfig;
use crate::types::{
    AsTypeDefEx as _, FindAttribute, NamedTypeRef, RefAttr, RefAttrs, Struct, Type, TypeDef,
    TypeRef,
};
use crate::validation::types::validate_value;
use crate::{runtimes::prisma::relationship::Cardinality, types::TypeId};
use indexmap::IndexMap;
use std::rc::Rc;
pub use tg_schema::runtimes::prisma::{ScalarType, StringType};
use tg_schema::{EffectType, InjectionData};

#[derive(Debug, Clone)]
pub struct ModelType {
    pub type_id: TypeId,
    pub name_ref: NamedTypeRef,
    pub resolved: Rc<Struct>,
    pub attrs: RefAttrs,
}

impl ModelType {
    pub fn name(&self) -> Rc<str> {
        self.name_ref.name.clone()
    }
}

// fn resolve_indirect(type_id: TypeId) -> Result<TypeId> {
//     match type_id.as_type()? {
//         Type::Def(_) => Ok(type_id),
//         Type::Ref(type_ref) => match type_ref.target.as_ref() {
//             RefTarget::Indirect(name) => Store::get_type_by_name(&name)
//                 .ok_or_else(|| format!("indirect type not found: {}", name).into())
//                 .map(|t| t.id)
//                 .and_then(resolve_indirect),
//             RefTarget::Link(link) => resolve_indirect(link.id),
//             _ => Ok(type_id),
//         },
//     }
// }

impl TryFrom<TypeId> for ModelType {
    type Error = TgError;

    fn try_from(type_id: TypeId) -> Result<Self> {
        match type_id.as_type().context("building ModelType")? {
            Type::Def(_) => Err(errors::unnamed_model(&type_id.repr().unwrap())),
            Type::Ref(type_ref) => match &type_ref {
                TypeRef::Named(name_ref) => {
                    let xdef = type_id.as_xdef()?;
                    let resolved = xdef.type_def.as_struct()?;
                    Ok(Self {
                        type_id,
                        name_ref: name_ref.clone(),
                        resolved,
                        attrs: xdef.attributes,
                    })
                }
                TypeRef::Indirect(indirect) => {
                    let xdef = type_id.as_xdef()?;
                    let resolved = xdef.type_def.as_struct()?;
                    Ok(Self {
                        type_id,
                        name_ref: Store::get_type_by_name(&indirect.name)
                            .ok_or_else(|| errors::unnamed_model(&type_id.repr().unwrap()))?,
                        resolved,
                        attrs: xdef.attributes,
                    })
                }
                TypeRef::Link(link) => match link.attribute.as_ref() {
                    RefAttr::RuntimeConfig { runtime, .. } if runtime == "prisma" => {
                        ModelType::try_from(link.target.id())
                    }
                    _ => {
                        let flat = type_ref.flatten();
                        if flat.name.is_some() {
                            Err(format!(
                                "name should be the latest attribute on a model type: {:?}",
                                type_id.repr().unwrap()
                            )
                            .into())
                        } else {
                            Err(errors::unnamed_model(&type_id.repr().unwrap()))
                        }
                    }
                },
                _ => {
                    let flat = type_ref.flatten();
                    if flat.name.is_some() {
                        Err(format!(
                            "name should be the latest attribute on a model type: {:?}",
                            type_id.repr().unwrap()
                        )
                        .into())
                    } else {
                        Err(errors::unnamed_model(&type_id.repr().unwrap()))
                    }
                }
            },
        }
    }
}

impl std::hash::Hash for ModelType {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.type_id.hash(state);
    }
}

impl std::cmp::PartialEq for ModelType {
    fn eq(&self, other: &Self) -> bool {
        self.name_ref.name == other.name_ref.name
    }
}
impl std::cmp::Eq for ModelType {}

#[derive(Debug)]
pub struct Model {
    pub model_type: ModelType,
    pub props: IndexMap<String, Property>,
    pub id_fields: Vec<String>,
    pub unique_constraints: Vec<Vec<String>>,
    // property -> relationship name
    pub relationships: IndexMap<String, String>,
}

impl TryFrom<TypeId> for Model {
    type Error = crate::wit::core::Error;

    fn try_from(type_id: TypeId) -> Result<Self> {
        let model_type = ModelType::try_from(type_id)?;
        // print(&format!(
        //     "MODEL type_id={type_id:?}; type_def.id={:?} attrs={attrs:?}",
        //     type_def.id()
        // ));
        // let typ = type_def.as_struct()?;

        let props = model_type
            .resolved
            .iter_props()
            .map(|(k, type_id)| Property::new(type_id).map(|p| (k.to_string(), p)))
            .collect::<Result<IndexMap<_, _>>>()?;

        let config = RuntimeConfig(model_type.attrs.find_runtime_attrs(""));

        let id_fields = model_type.resolved.data.find_id_fields()?;
        let id_fields = match id_fields.len() {
            0 => {
                let id_fields = config.get("id")?;
                match id_fields {
                    Some(id_fields) => id_fields,
                    None => return Err(errors::id_field_not_found(&model_type.name())),
                }
            }
            _ => id_fields,
        };

        let unique_constraints = get_struct_level_unique_constraints(&model_type.name(), &config)?;

        Ok(Self {
            model_type,
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

    pub fn iter_related_models(&self) -> impl Iterator<Item = ModelType> + '_ {
        self.props.iter().filter_map(|(_, p)| match p {
            Property::Model(p) => Some(p.model_type.clone()),
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

impl From<PrismaRefData> for RelationshipAttributes {
    fn from(data: PrismaRefData) -> Self {
        Self {
            name: data.rel_name,
            target_field: data.target_field,
            fkey: data.fkey,
        }
    }
}

impl RelationshipAttributes {
    pub fn new(attrs: &RefAttrs) -> Result<Self> {
        let attrs = attrs.find_runtime_attr("prisma");
        let ref_data: Option<PrismaRefData> =
            attrs.map(|attr| serde_json::from_value(attr.clone()).unwrap());
        Ok(ref_data.map(|it| it.into()).unwrap_or_default())
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
    pub model_type: ModelType,
    pub quantifier: Cardinality,
    pub relationship_attributes: RelationshipAttributes,
    pub unique: bool,
}

impl Property {
    fn new(wrapper_type_id: TypeId) -> Result<Self> {
        let xdef = wrapper_type_id.as_xdef()?;
        let runtime_config = RuntimeConfig(xdef.attributes.find_runtime_attrs(""));
        let unique = if matches!(xdef.type_def, TypeDef::Struct(_)) {
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

        let (inner_type_id, card) = match &xdef.type_def {
            TypeDef::Optional(ref inner) => (TypeId(inner.data.of), Cardinality::Optional),
            TypeDef::List(inner) => (TypeId(inner.data.of), Cardinality::Many),
            _ => (wrapper_type_id, Cardinality::One),
        };

        let type_def = inner_type_id.as_xdef()?.type_def;

        let scalar = |typ, injection| {
            Self::Scalar(ScalarProperty {
                wrapper_type_id,
                type_id: inner_type_id,
                type_def: type_def.clone(),
                prop_type: typ,
                injection,
                quantifier: card,
                unique,
                auto,
                default_value,
            })
        };

        match xdef
            .attributes
            .find_injection()
            .map(Injection::try_from)
            .transpose()
        {
            Ok(injection) => match &type_def {
                TypeDef::Struct(_) => {
                    if injection.is_some() {
                        return Err("injection not supported for models".to_string().into());
                    }
                    Ok(Self::Model(RelationshipProperty {
                        wrapper_type_id,
                        quantifier: card,
                        model_type: ModelType::try_from(inner_type_id)?,
                        relationship_attributes: RelationshipAttributes::new(&xdef.attributes)?,
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
            Err(_) => match &type_def {
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
    fn convert_injection(data: &InjectionData) -> Option<Self> {
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

    fn convert_dynamic_injection(data: &InjectionData) -> Option<Self> {
        match data {
            InjectionData::SingleValue(_) => None, // unmanaged
            InjectionData::ValueByEffect(map) => {
                if map.contains_key(&EffectType::Read) {
                    // TODO check if other effects are present??
                    None
                } else {
                    Some(Self {
                        create: map.get(&EffectType::Create).and_then(|i| match i.as_str() {
                            Some("now") => Some(InjectionHandler::PrismaDateNow),
                            _ => None,
                        }),
                        update: map.get(&EffectType::Update).and_then(|i| match i.as_str() {
                            Some("now") => Some(InjectionHandler::PrismaDateNow),
                            _ => None,
                        }),
                    })
                }
            }
        }
    }
}

impl TryFrom<&tg_schema::Injection> for Injection {
    // unmanaged property
    type Error = ();

    fn try_from(injection: &tg_schema::Injection) -> Result<Self, Self::Error> {
        use tg_schema::Injection as I;

        match injection {
            I::Static(inj) | I::Secret(inj) | I::Context(inj) | I::Random(inj) => {
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
    #[allow(unused)]
    pub type_def: TypeDef,
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
    use crate::t::{self, TypeBuilder};

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
            .propx("one", t::string().as_id()?)?
            .propx("two", t::string().set_value("Hello".to_string()))?
            .build_named("A")?;
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
