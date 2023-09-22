// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{ObjectTypeData, TypeNode};
use errors::Result;
use indexmap::IndexMap;

use crate::{
    conversion::types::{gen_base, TypeConversion},
    errors,
    typegraph::TypegraphContext,
    types::{Struct, TypeData, TypeId},
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
}

impl TypeConversion for Struct {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        Ok(TypeNode::Object {
            base: gen_base(
                self.base
                    .name
                    .clone()
                    .unwrap_or_else(|| format!("object_{}", self.id.0)),
                self.base.runtime_config.clone(),
                runtime_id.unwrap(),
            )
            .build(),
            data: ObjectTypeData {
                properties: self
                    .iter_props()
                    .map(|(name, type_id)| -> Result<(String, u32)> {
                        let id = type_id.resolve_proxy()?;
                        Ok((name.to_string(), ctx.register_type(id, runtime_id)?.into()))
                    })
                    .collect::<Result<IndexMap<_, _>>>()?,
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

impl TypeData for TypeStruct {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        for (name, tpe_id) in self.props.iter() {
            params.push(format!("[{}] => #{}", name, tpe_id));
        }
    }

    fn variant_name(&self) -> String {
        "struct".to_string()
    }
}

impl TypeStruct {
    pub fn get_prop_type(&self, name: &str) -> Option<TypeId> {
        self.props
            .iter()
            .find_map(|(n, t)| if n == name { Some(t.into()) } else { None })
    }
}
