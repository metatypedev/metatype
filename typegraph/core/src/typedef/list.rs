// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{ListTypeData, TypeNode};

use crate::{
    conversion::types::{BaseBuilderInit, TypeConversion},
    errors::Result,
    typegraph::TypegraphContext,
    types::{List, TypeDefData, TypeId},
    wit::core::TypeList,
};

impl TypeConversion for List {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        Ok(TypeNode::List {
            base: BaseBuilderInit {
                ctx,
                base_name: "list",
                type_id: self.id,
                name: self.base.name.clone(),
                runtime_idx: runtime_id.unwrap(),
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .inject(self.extended_base.injection.clone())?
            .build()?,
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
