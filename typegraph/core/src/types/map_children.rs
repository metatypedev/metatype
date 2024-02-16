// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;
use std::rc::Rc;

use crate::errors::Result;
use crate::global_store::{NameRegistration, Store};
use crate::t::{self, TypeBuilder};
use crate::utils::clear_name;
use crate::wit::core::{TypeEither, TypeList, TypeOptional, TypeStruct, TypeUnion};

use super::{Either, List, Optional, Struct, TypeDef, TypeId, Union};

struct MapChildren<M>
where
    M: Fn(TypeId) -> Result<TypeId>,
{
    result_aliases: HashMap<TypeId, String>,
    mapper: M,
}

impl<M> MapChildren<M>
where
    M: Fn(TypeId) -> Result<TypeId>,
{
    fn new(mapper: M) -> Self {
        Self {
            result_aliases: HashMap::new(),
            mapper,
        }
    }

    fn map_children(&mut self, type_id: TypeId) -> Result<TypeId> {
        let (_, type_def) = type_id.resolve_ref()?;
        if let Some(alias) = self.result_aliases.get(&type_id) {
            return t::ref_(alias).build();
        }
        self.result_aliases.insert(type_id, Store::generate_alias());

        let res = match type_def {
            TypeDef::Struct(s) => {
                let type_data = self.map_props(s.data.clone())?;
                if type_data.props == s.data.props {
                    return Ok(type_id);
                }

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
                    of: (self.mapper)(l.data.of.into())?.0,
                    ..l.data
                };
                if type_data.of == l.data.of {
                    return Ok(type_id);
                }

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
                    of: (self.mapper)(o.data.of.into())?.0,
                    ..o.data.clone()
                };
                if type_data.of == o.data.of {
                    return Ok(type_id);
                }

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
                    .map(|id| -> Result<_> { Ok((self.mapper)(id.into())?.0) })
                    .collect::<Result<Vec<_>>>()?;
                if variants == u.data.variants {
                    return Ok(type_id);
                }
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
                    .map(|id| -> Result<_> { Ok((self.mapper)(id.into())?.0) })
                    .collect::<Result<Vec<_>>>()?;
                if variants == e.data.variants {
                    return Ok(type_id);
                }
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
        }?;

        Store::register_alias(self.result_aliases.get(&type_id).unwrap(), type_id)?;

        Ok(res)
    }

    fn map_props(&mut self, struct_data: TypeStruct) -> Result<TypeStruct> {
        let props = struct_data
            .props
            .iter()
            .map(|(k, v)| -> Result<_> { Ok((k.clone(), (self.mapper)(v.into())?.0)) })
            .collect::<Result<Vec<_>>>()?;
        Ok(TypeStruct {
            props,
            ..struct_data
        })
    }
}

pub fn map_children<F>(type_id: TypeId, f: &F) -> Result<TypeId>
where
    F: Fn(TypeId) -> Result<TypeId>,
{
    MapChildren::new(f).map_children(type_id)
}
