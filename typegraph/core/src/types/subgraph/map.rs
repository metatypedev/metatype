// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::errors::Result;
use crate::global_store::Store;
use crate::t::{self, TypeBuilder};
use crate::types::{TypeDef, TypeId};
use crate::wit::core::{TypeEither, TypeList, TypeOptional, TypeStruct, TypeUnion};

#[derive(Debug, Clone)]
struct Context {
    result_aliases: HashMap<TypeId, String>,
}

struct SubgraphMap<M>
where
    M: Fn(TypeId) -> Result<TypeId>,
{
    mapper: M,
}

pub fn map<M>(root: TypeId, mapper: M) -> Result<TypeId>
where
    M: Fn(TypeId) -> Result<TypeId>,
{
    let mut ctx = Context {
        result_aliases: HashMap::new(),
    };
    SubgraphMap { mapper }.map(root, &mut ctx)
}

impl<M> SubgraphMap<M>
where
    M: Fn(TypeId) -> Result<TypeId>,
{
    pub fn map(&self, type_id: TypeId, ctx: &mut Context) -> Result<TypeId> {
        if let Some(alias) = ctx.result_aliases.get(&type_id) {
            return t::ref_(alias).build();
        }
        let alias = Store::generate_alias();
        ctx.result_aliases.insert(type_id, alias.clone());

        let new_type_id = (self.mapper)(type_id)?;

        let res = self.map_children(new_type_id, ctx)?;
        Store::register_alias(alias, res)?;
        ctx.result_aliases.remove(&type_id);

        Ok(res)
    }

    fn map_children(&self, type_id: TypeId, ctx: &mut Context) -> Result<TypeId> {
        let (_, type_def) = type_id.resolve_ref()?;

        match type_def {
            TypeDef::Struct(ty) => {
                let props = ty
                    .data
                    .props
                    .iter()
                    .map(|(name, prop)| -> Result<_> {
                        let prop_type = self.map(prop.into(), ctx)?;
                        Ok((name.clone(), prop_type.0))
                    })
                    .collect::<Result<Vec<(String, u32)>>>()?;

                if props == ty.data.props {
                    Ok(type_id)
                } else {
                    ty.type_with_data(TypeStruct {
                        props,
                        ..ty.data.clone()
                    })
                }
            }

            TypeDef::List(ty) => {
                let item_type = self.map(ty.data.of.into(), ctx)?.0;
                if item_type == ty.data.of {
                    Ok(type_id)
                } else {
                    ty.type_with_data(TypeList {
                        of: item_type,
                        ..ty.data
                    })
                }
            }

            TypeDef::Optional(ty) => {
                let item_type = self.map(ty.data.of.into(), ctx)?.0;
                if item_type == ty.data.of {
                    Ok(type_id)
                } else {
                    ty.type_with_data(TypeOptional {
                        of: item_type,
                        ..ty.data.clone()
                    })
                }
            }

            TypeDef::Union(ty) => {
                let variants = ty
                    .data
                    .variants
                    .iter()
                    .map(|type_id| self.map(type_id.into(), ctx).map(|x| x.0))
                    .collect::<Result<Vec<u32>>>()?;

                if variants == ty.data.variants {
                    Ok(type_id)
                } else {
                    ty.type_with_data(TypeUnion { variants })
                }
            }

            TypeDef::Either(ty) => {
                let variants = ty
                    .data
                    .variants
                    .iter()
                    .map(|type_id| self.map(type_id.into(), ctx).map(|x| x.0))
                    .collect::<Result<Vec<u32>>>()?;

                if variants == ty.data.variants {
                    Ok(type_id)
                } else {
                    ty.type_with_data(TypeEither { variants })
                }
            }

            TypeDef::Boolean(_)
            | TypeDef::Integer(_)
            | TypeDef::Float(_)
            | TypeDef::String(_)
            | TypeDef::File(_) => Ok(type_id),

            TypeDef::Func(_) => Err("not supported".into()),
        }
    }
}
