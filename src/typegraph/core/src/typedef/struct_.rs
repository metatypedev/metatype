// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::conversion::hash::Hashable;
use crate::conversion::types::{BaseBuilderInit, TypeConversion};
use crate::types::{
    AsTypeDefEx as _, ExtendedTypeDef, FindAttribute as _, IdKind, PolicySpec, Struct, TypeDef,
    TypeDefData, TypeId,
};
use crate::{errors, typegraph::TypegraphContext, wit::core::TypeStruct};
use common::typegraph::{ObjectTypeData, PolicyIndices, TypeNode};
use errors::Result;
use indexmap::IndexMap;
use std::hash::Hash as _;

impl TypeStruct {
    pub fn get_prop(&self, key: &str) -> Option<TypeId> {
        self.props
            .iter()
            .filter(|(k, _)| k == key)
            .map(|(_, v)| *v)
            .next()
            .map(|id| id.into())
    }

    pub fn find_id_fields(&self) -> Result<Vec<String>> {
        let mut res = Vec::new();
        let mut kind = None;
        for (name, type_id) in &self.props {
            let xdef = TypeId(*type_id).as_xdef()?;
            match kind {
                None => match xdef.id_kind()? {
                    Some(IdKind::Simple) => {
                        res.push(name.clone());
                        kind = Some(IdKind::Simple);
                    }
                    Some(IdKind::Composite) => {
                        res.push(name.clone());
                        kind = Some(IdKind::Composite);
                    }
                    None => {}
                },
                Some(IdKind::Simple) => {
                    if xdef.id_kind()?.is_some() {
                        return Err("Multiple id fields found".into());
                    }
                }
                Some(IdKind::Composite) => match xdef.id_kind()? {
                    Some(IdKind::Simple) => {
                        return Err("Inconsistent id fields".into());
                    }
                    Some(IdKind::Composite) => {
                        res.push(name.clone());
                    }
                    None => {}
                },
            }
        }
        Ok(res)
    }
}

impl TypeConversion for Struct {
    fn convert(&self, ctx: &mut TypegraphContext, xdef: ExtendedTypeDef) -> Result<TypeNode> {
        Ok(TypeNode::Object {
            base: BaseBuilderInit {
                base_name: "object",
                type_id: self.id,
                name: xdef.get_owned_name(),
            }
            .init_builder()?
            .enum_(self.data.enumeration.as_deref())
            .build()?,
            data: ObjectTypeData {
                properties: self
                    .iter_props()
                    .map(|(name, type_id)| -> Result<(String, u32)> {
                        Ok((name.to_string(), ctx.register_type(type_id)?.into()))
                    })
                    .collect::<Result<IndexMap<_, _>>>()?,
                id: self.data.find_id_fields()?,
                required: Vec::new(),
                policies: self.data.collect_policies(ctx)?,
            },
        })
    }
}

impl Struct {
    pub fn iter_props(&self) -> impl Iterator<Item = (&str, TypeId)> {
        self.data.props.iter().map(|(k, v)| (k.as_str(), v.into()))
    }
}

impl TypeDefData for TypeStruct {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        for (name, tpe_id) in self.props.iter() {
            params.push(format!("[{}] => #{}", name, tpe_id));
        }
    }

    fn variant_name(&self) -> &'static str {
        "struct"
    }
}

impl Hashable for TypeStruct {
    fn hash(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        tg: &mut TypegraphContext,
    ) -> Result<()> {
        "struct".hash(hasher);
        for (name, tpe_id) in &self.props {
            name.hash(hasher);
            TypeId(*tpe_id).hash_child_type(hasher, tg)?;
        }
        Ok(())
    }
}

impl TypeStruct {
    pub fn get_prop_type(&self, name: &str) -> Option<TypeId> {
        self.props
            .iter()
            .find_map(|(n, t)| if n == name { Some(t.into()) } else { None })
    }
}

impl TypeStruct {
    fn collect_policies(
        &self,
        ctx: &mut TypegraphContext,
    ) -> Result<IndexMap<String, Vec<PolicyIndices>>> {
        let mut res = IndexMap::new();
        for (name, tpe_id) in &self.props {
            let mut chain = vec![];
            extend_policy_chain(&mut chain, TypeId(*tpe_id))?;

            res.insert(name.clone(), ctx.register_policy_chain(&chain)?);
        }
        Ok(res)
    }
}

pub fn extend_policy_chain(chain: &mut Vec<PolicySpec>, type_id: TypeId) -> Result<()> {
    let xdef = type_id.as_xdef()?;
    let policies = xdef.attributes.find_policy().unwrap_or(&[]);
    chain.extend(policies.iter().cloned());

    match xdef.type_def {
        TypeDef::Optional(inner) => {
            extend_policy_chain(chain, TypeId(inner.data.of))?;
        }
        TypeDef::List(inner) => {
            extend_policy_chain(chain, TypeId(inner.data.of))?;
        }
        TypeDef::Union(inner) => {
            for tpe_id in inner.data.variants.iter() {
                extend_policy_chain(chain, TypeId(*tpe_id))?;
            }
        }
        TypeDef::Either(inner) => {
            for tpe_id in inner.data.variants.iter() {
                extend_policy_chain(chain, TypeId(*tpe_id))?;
            }
        }
        TypeDef::Func(inner) => {
            extend_policy_chain(chain, TypeId(inner.data.out))?;
        }
        TypeDef::Struct(_) => {
            // noop
            // struct is the boundary
        }
        // scalar types
        TypeDef::Integer(_)
        | TypeDef::Float(_)
        | TypeDef::Boolean(_)
        | TypeDef::String(_)
        | TypeDef::File(_) => {}
    }

    Ok(())
}
