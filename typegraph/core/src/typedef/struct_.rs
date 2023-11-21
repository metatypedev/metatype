// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{ObjectTypeData, TypeNode};
use errors::Result;
use indexmap::IndexMap;

use crate::{
    conversion::types::{BaseBuilderInit, TypeConversion},
    errors,
    global_store::Store,
    typegraph::TypegraphContext,
    types::{Struct, TypeDefData, TypeId},
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
            .inject(self.extended_base.injection.clone())?
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

impl TypeStruct {
    pub fn get_prop_type(&self, name: &str) -> Option<TypeId> {
        self.props
            .iter()
            .find_map(|(n, t)| if n == name { Some(t.into()) } else { None })
    }
}
