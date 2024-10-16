// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashSet;

use common::typegraph::Injection;

use crate::{
    errors::{self, Result, TgError},
    global_store::{NameRegistration, Store},
};

use super::core::{
    PolicySpec, TypeBase, TypeEither, TypeFile, TypeFloat, TypeFunc, TypeId as CoreTypeId,
    TypeInteger, TypeList, TypeOptional, TypeString, TypeStruct, TypeUnion,
};

use super::{
    AsId, Boolean, Either, File, Float, Func, Integer, List, Optional, StringT, Struct,
    TypeBoolean, TypeDef, TypeDefExt, TypeId, TypeRef, Union, WithInjection, WithPolicy,
};

pub fn refb(name: String, attr: Option<String>) -> Result<CoreTypeId> {
    Ok(TypeRef::indirect(
        name,
        attr.map(|attr| {
            serde_json::from_str(&attr)
                .map_err(|e| format!("Could not parse ref attributes: {e:?}"))
        })
        .transpose()?,
    )?
    .id
    .0)
}

pub fn integerb(data: TypeInteger, base: TypeBase) -> Result<CoreTypeId> {
    if let (Some(min), Some(max)) = (data.min, data.max) {
        if min >= max {
            return Err(errors::invalid_max_value());
        }
    }
    if let (Some(min), Some(max)) = (data.exclusive_minimum, data.exclusive_maximum) {
        if min >= max {
            return Err(errors::invalid_max_value());
        }
    }
    Ok(Store::register_type_def(
        |id| TypeDef::Integer(Integer { id, base, data }.into()),
        NameRegistration(true),
    )?
    .into())
}

pub fn floatb(data: TypeFloat, base: TypeBase) -> Result<CoreTypeId> {
    if let (Some(min), Some(max)) = (data.min, data.max) {
        if min >= max {
            return Err(errors::invalid_max_value());
        }
    }
    if let (Some(min), Some(max)) = (data.exclusive_minimum, data.exclusive_maximum) {
        if min >= max {
            return Err(errors::invalid_max_value());
        }
    }
    Ok(Store::register_type_def(
        |id| TypeDef::Float(Float { id, base, data }.into()),
        NameRegistration(true),
    )?
    .into())
}

pub fn booleanb(base: TypeBase) -> Result<CoreTypeId> {
    Ok(Store::register_type_def(
        |id| {
            TypeDef::Boolean(
                Boolean {
                    id,
                    base,
                    data: TypeBoolean,
                }
                .into(),
            )
        },
        NameRegistration(true),
    )?
    .into())
}

pub fn stringb(data: TypeString, base: TypeBase) -> Result<CoreTypeId> {
    if let (Some(min), Some(max)) = (data.min, data.max) {
        if min >= max {
            return Err(errors::invalid_max_value());
        }
    }
    Ok(Store::register_type_def(
        |id| TypeDef::String(StringT { id, base, data }.into()),
        NameRegistration(true),
    )?
    .into())
}

pub fn as_id(type_id: CoreTypeId, composite: bool) -> Result<CoreTypeId> {
    TypeId(type_id).as_type()?.as_id(composite).map(|t| t.id.0)
}

pub fn fileb(data: TypeFile, base: TypeBase) -> Result<CoreTypeId> {
    if let (Some(min), Some(max)) = (data.min, data.max) {
        if min >= max {
            return Err(errors::invalid_max_value());
        }
    }
    Ok(Store::register_type_def(
        |id| {
            /* // TODO why??
            let base = TypeBase {
                name: Some(format!("_{}_file", id.0)),
                ..base
            }; */
            TypeDef::File(File { id, base, data }.into())
        },
        NameRegistration(true),
    )?
    .into())
}

pub fn listb(data: TypeList, base: TypeBase) -> Result<CoreTypeId> {
    if let (Some(min), Some(max)) = (data.min, data.max) {
        if min > max {
            return Err(errors::invalid_max_value());
        }
    }
    Ok(Store::register_type_def(
        |id| TypeDef::List(List { id, base, data }.into()),
        NameRegistration(true),
    )?
    .into())
}

pub fn optionalb(data: TypeOptional, base: TypeBase) -> Result<CoreTypeId> {
    /* let inner_name = match base.name {
        Some(_) => None,
        None => TypeId(data.of).name()?,
    }; */
    Ok(Store::register_type_def(
        |id| {
            /* let base = match inner_name {
                Some(n) => TypeBase {
                    name: Some(format!("_{}_{}?", id.0, n)),
                    ..base
                },
                None => base,
            }; */
            TypeDef::Optional(Optional { id, base, data }.into())
        },
        NameRegistration(true),
    )?
    .into())
}

pub fn unionb(data: TypeUnion, base: TypeBase) -> Result<CoreTypeId> {
    Ok(Store::register_type_def(
        |id| TypeDef::Union(Union { id, base, data }.into()),
        NameRegistration(true),
    )?
    .into())
}

pub fn eitherb(data: TypeEither, base: TypeBase) -> Result<CoreTypeId> {
    Ok(Store::register_type_def(
        |id| TypeDef::Either(Either { id, base, data }.into()),
        NameRegistration(true),
    )?
    .into())
}

pub fn structb(data: TypeStruct, base: TypeBase) -> Result<CoreTypeId> {
    let mut prop_names = HashSet::new();
    for (name, _) in data.props.iter() {
        if prop_names.contains(name) {
            return Err(errors::duplicate_key(name));
        }
        prop_names.insert(name.clone());
    }

    Ok(Store::register_type_def(
        |id| TypeDef::Struct(Struct { id, base, data }.into()),
        NameRegistration(true),
    )?
    .into())
}

pub fn funcb(data: TypeFunc) -> Result<CoreTypeId> {
    let wrapper_type = TypeId(data.inp);
    if !matches!(TypeDef::try_from(wrapper_type)?, TypeDef::Struct(_)) {
        return Err(errors::invalid_input_type(&wrapper_type.repr()?));
    }

    let base = TypeBase::default();
    Ok(Store::register_type_def(
        |id| TypeDef::Func(Func { id, base, data }.into()),
        NameRegistration(true),
    )?
    .into())
}

pub fn extend_struct(
    type_id: CoreTypeId,
    new_props: Vec<(String, CoreTypeId)>,
) -> Result<CoreTypeId> {
    let type_def = TypeId(type_id).as_struct()?;
    let mut props = type_def.data.props.clone();
    props.extend(new_props);

    Ok(Store::register_type_def(
        |id| {
            TypeDef::Struct(
                Struct {
                    id,
                    base: clear_name(&type_def.base),
                    data: TypeStruct {
                        props,
                        ..type_def.data.clone()
                    },
                }
                .into(),
            )
        },
        NameRegistration(false),
    )?
    .into())
}

pub fn with_policy(type_id: CoreTypeId, policy_chain: Vec<PolicySpec>) -> Result<CoreTypeId> {
    let policy_chain = policy_chain
        .into_iter()
        .map(|p| p.into())
        .collect::<Vec<_>>();
    Ok(TypeId(type_id).with_policy(policy_chain)?.id.into())
}

pub fn with_injection(type_id: CoreTypeId, injection: String) -> Result<CoreTypeId> {
    // validation
    let injection: Injection =
        serde_json::from_str(&injection).map_err(|e| errors::TgError::from(e.to_string()))?;
    Ok(TypeId(type_id).with_injection(injection)?.id.into())
}

pub fn rename_type(type_id: CoreTypeId, new_name: String) -> Result<CoreTypeId> {
    match TypeId(type_id).as_type_def()? {
        Some(type_def) => {
            let mut base = type_def.base().clone();
            base.name = Some(new_name);
            Ok(Store::register_type_def(
                move |id| type_def.with_base(id, base.clone()),
                NameRegistration(true),
            )?
            .into())
        }
        None => Err(TgError::from("cannot rename ref type")),
    }
}

fn clear_name(base: &TypeBase) -> TypeBase {
    TypeBase {
        name: None,
        ..base.clone()
    }
}
