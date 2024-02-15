// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::rc::Rc;

use crate::errors::Result;
use crate::global_store::{NameRegistration, Store};
use crate::utils::clear_name;
use crate::wit::core::{TypeEither, TypeList, TypeOptional, TypeStruct, TypeUnion};

use super::{Either, List, Optional, Struct, TypeDef, TypeId, Union};

pub fn map_children<F>(type_id: TypeId, f: &F) -> Result<TypeId>
where
    F: Fn(TypeId) -> Result<TypeId>,
{
    let (_, type_def) = type_id.resolve_ref()?;
    match type_def {
        TypeDef::Struct(s) => {
            let type_data = map_props(s.data.clone(), f)?;
            Store::register_type_def(
                |id| {
                    TypeDef::Struct(Rc::new(Struct {
                        id,
                        base: clear_name(&s.base),
                        extended_base: s.extended_base.clone(),
                        data: type_data,
                    }))
                },
                NameRegistration(false),
            )
        }

        TypeDef::List(l) => {
            let type_data = TypeList {
                of: f(l.data.of.into())?.0,
                ..l.data
            };
            Store::register_type_def(
                |id| {
                    TypeDef::List(Rc::new(List {
                        id,
                        base: clear_name(&l.base),
                        extended_base: l.extended_base.clone(),
                        data: type_data,
                    }))
                },
                NameRegistration(false),
            )
        }

        TypeDef::Optional(o) => {
            let type_data = TypeOptional {
                of: f(o.data.of.into())?.0,
                ..o.data.clone()
            };
            Store::register_type_def(
                |id| {
                    TypeDef::Optional(Rc::new(Optional {
                        id,
                        base: clear_name(&o.base),
                        extended_base: o.extended_base.clone(),
                        data: type_data,
                    }))
                },
                NameRegistration(false),
            )
        }

        TypeDef::Union(u) => {
            let variants = u
                .data
                .variants
                .iter()
                .map(|id| -> Result<_> { Ok(f(id.into())?.0) })
                .collect::<Result<Vec<_>>>()?; // map => collect
            let type_data = TypeUnion { variants };
            Store::register_type_def(
                |id| {
                    TypeDef::Union(Rc::new(Union {
                        id,
                        base: clear_name(&u.base),
                        extended_base: u.extended_base.clone(),
                        data: type_data,
                    }))
                },
                NameRegistration(false),
            )
        }

        TypeDef::Either(e) => {
            let variants = e
                .data
                .variants
                .iter()
                .map(|id| -> Result<_> { Ok(f(id.into())?.0) })
                .collect::<Result<Vec<_>>>()?;
            let type_data = TypeEither { variants };

            Store::register_type_def(
                |id| {
                    TypeDef::Either(Rc::new(Either {
                        id,
                        base: clear_name(&e.base),
                        extended_base: e.extended_base.clone(),
                        data: type_data,
                    }))
                },
                NameRegistration(false),
            )
        }

        TypeDef::Boolean(_)
        | TypeDef::Integer(_)
        | TypeDef::Float(_)
        | TypeDef::String(_)
        | TypeDef::File(_) => Ok(type_id),

        TypeDef::Func(_) => Ok(type_id),
    }
}

pub fn map_props<F>(struct_data: TypeStruct, f: &F) -> Result<TypeStruct>
where
    F: Fn(TypeId) -> Result<TypeId>,
{
    let props = struct_data
        .props
        .iter()
        .map(|(k, v)| -> Result<_> { Ok((k.clone(), f(v.into())?.0)) })
        .collect::<Result<Vec<_>>>()?;
    Ok(TypeStruct {
        props,
        ..struct_data
    })
}
