// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{ArrayTypeData, TypeNode};

use crate::{
    conversion::types::{gen_base, TypeConversion},
    errors::Result,
    global_store::with_store,
    typegraph::TypegraphContext,
    types::{Array, TypeData, TypeId},
    wit::core::TypeArray,
};

impl TypeConversion for Array {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        Ok(TypeNode::Array {
            base: gen_base(
                self.base
                    .name
                    .clone()
                    .unwrap_or_else(|| format!("array_{}", self.id.0)),
                self.base.runtime_config.clone(),
                runtime_id.unwrap(),
            )
            .build(),
            data: ArrayTypeData {
                items: with_store(|s| -> Result<_> {
                    let id = TypeId(self.data.of).resolve_proxy()?;
                    Ok(ctx.register_type(s, id, runtime_id)?.into())
                })?,
                max_items: self.data.max,
                min_items: self.data.min,
                unique_items: self.data.unique_items,
            },
        })
    }
}

impl TypeData for TypeArray {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("items={}", self.of));
        if let Some(min) = self.min {
            params.push(format!("minItems={}", min));
        }
        if let Some(max) = self.max {
            params.push(format!("maxItems={}", max));
        }
        if let Some(unique) = self.unique_items {
            params.push(format!("uniqueItems={}", unique));
        }
    }

    fn variant_name(&self) -> String {
        "array".to_string()
    }
}
