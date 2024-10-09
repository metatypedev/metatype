// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::hash::Hash as _;

use common::typegraph::{ListTypeData, TypeNode};

use crate::{
    conversion::{
        hash::Hashable,
        types::{BaseBuilderInit, TypeConversion},
    },
    errors::Result,
    typegraph::TypegraphContext,
    types::{List, TypeDefData, TypeId},
    wit::core::TypeList,
};

impl TypeConversion for List {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::List {
            base: BaseBuilderInit {
                ctx,
                base_name: "list",
                type_id: self.id,
                name: self.base.name.clone(),
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .inject(self.extended_base.injection.clone())?
            .build()?,
            data: ListTypeData {
                items: ctx.register_type(TypeId(self.data.of).try_into()?)?.into(),
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

impl Hashable for TypeList {
    fn hash(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        tg: &mut TypegraphContext,
    ) -> Result<()> {
        "list".hash(hasher);
        self.min.hash(hasher);
        self.max.hash(hasher);
        self.unique_items.hash(hasher);
        TypeId(self.of).hash_child_type(hasher, tg)?;
        Ok(())
    }
}
