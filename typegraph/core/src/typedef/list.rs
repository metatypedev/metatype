// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{ListTypeData, TypeNode};

use crate::{
    conversion::types::{gen_base_concrete, TypeConversion},
    errors::Result,
    typegraph::TypegraphContext,
    types::{List, TypeDefData, TypeId},
    wit::core::TypeList,
};

impl TypeConversion for List {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        let policies = ctx.register_policy_chain(&self.extended_base.policies)?;
        Ok(TypeNode::List {
            base: gen_base_concrete!("list", self, runtime_id.unwrap(), policies, [injection]),
            data: ListTypeData {
                items: ctx
                    .register_type(TypeId(self.data.of).try_into()?, runtime_id)?
                    .into(),
                max_items: self.data.max,
                min_items: self.data.min,
                unique_items: self.data.unique_items,
            },
        })
    }
}

impl TypeDefData for TypeList {
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

    fn variant_name(&self) -> &'static str {
        "list"
    }
}
