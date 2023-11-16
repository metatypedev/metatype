// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{ListTypeData, TypeNode};

use crate::{
    conversion::types::{gen_base_concrete, TypeConversion},
    errors::Result,
    typegraph::TypegraphContext,
    types::{List, TypeData, TypeId},
    wit::core::TypeList,
};

impl TypeConversion for List {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        Ok(TypeNode::List {
            base: gen_base_concrete!("list", self, runtime_id.unwrap(), injection),
            data: ListTypeData {
                items: ctx
                    .register_type(TypeId(self.data.of).resolve_proxy()?, runtime_id)?
                    .into(),
                max_items: self.data.max,
                min_items: self.data.min,
                unique_items: self.data.unique_items,
            },
        })
    }
}

impl TypeData for TypeList {
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
        "list".to_string()
    }

    super::impl_into_type!(concrete, List);
}
