// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::hash::Hash as _;

use common::typegraph::{ObjectTypeData, TypeNode};
use errors::Result;
use indexmap::IndexMap;

use crate::{
    conversion::{
        hash::Hashable,
        types::{BaseBuilderInit, TypeConversion},
    },
    errors,
    global_store::Store,
    typegraph::TypegraphContext,
    types::{IdKind, RefAttrs, Struct, Type, TypeDefData, TypeId},
    wit::core::TypeStruct,
};

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
            if let Type::Ref(type_ref) = TypeId(*type_id).as_type()? {
                match kind {
                    None => match type_ref.id_kind()? {
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
                        if type_ref.id_kind()?.is_some() {
                            return Err("Multiple id fields found".into());
                        }
                    }
                    Some(IdKind::Composite) => match type_ref.id_kind()? {
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
        }
        Ok(res)
    }
}

impl TypeConversion for Struct {
    fn convert(
        &self,
        ctx: &mut TypegraphContext,
        runtime_id: Option<u32>,
        ref_attrs: RefAttrs,
    ) -> Result<TypeNode> {
        let runtime_id = match runtime_id {
            Some(runtime_id) => runtime_id,
            None => ctx.register_runtime(Store::get_deno_runtime())?,
        };
        Ok(TypeNode::Object {
            base: BaseBuilderInit {
                ctx,
                base_name: "object",
                type_id: self.id,
                name: self.base.name.clone(),
                runtime_idx: runtime_id,
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .enum_(self.data.enumeration.as_deref())
            .inject(ref_attrs.get_injection()?)?
            .build()?,
            data: ObjectTypeData {
                properties: self
                    .iter_props()
                    .map(|(name, type_id)| -> Result<(String, u32)> {
                        Ok((
                            name.to_string(),
                            ctx.register_type(type_id.try_into()?, Some(runtime_id))?
                                .into(),
                        ))
                    })
                    .collect::<Result<IndexMap<_, _>>>()?,
                id: self.data.find_id_fields()?,
                required: Vec::new(),
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
        runtime_id: Option<u32>,
    ) -> Result<()> {
        "struct".hash(hasher);
        for (name, tpe_id) in &self.props {
            name.hash(hasher);
            TypeId(*tpe_id).hash_child_type(hasher, tg, runtime_id)?;
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
