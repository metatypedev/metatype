// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::hash::Hash as _;

use common::typegraph::{TypeNode, UnionTypeData};
use errors::Result;

use crate::{
    conversion::{
        hash::Hashable,
        types::{BaseBuilderInit, TypeConversion},
    },
    errors,
    typegraph::TypegraphContext,
    types::{RefAttrs, TypeDefData, TypeId, Union},
    wit::core::TypeUnion,
};

impl TypeConversion for Union {
    fn convert(
        &self,
        ctx: &mut TypegraphContext,
        runtime_id: Option<u32>,
        ref_attrs: RefAttrs,
    ) -> Result<TypeNode> {
        Ok(TypeNode::Union {
            base: BaseBuilderInit {
                ctx,
                base_name: "union",
                type_id: self.id,
                name: self.base.name.clone(),
                runtime_idx: runtime_id.unwrap(),
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .inject(ref_attrs.get_injection()?)?
            .build()?,
            data: UnionTypeData {
                any_of: self
                    .data
                    .variants
                    .iter()
                    .map(|vid| -> Result<_> {
                        Ok(ctx.register_type(TypeId(*vid), runtime_id)?.into())
                    })
                    .collect::<Result<Vec<_>>>()?,
            },
        })
    }
}

impl TypeDefData for TypeUnion {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        for (i, tpe_id) in self.variants.iter().enumerate() {
            params.push(format!("[v{}] => #{}", i, tpe_id));
        }
    }

    fn variant_name(&self) -> &'static str {
        "union"
    }
}

impl Hashable for TypeUnion {
    fn hash(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        tg: &mut TypegraphContext,
        runtime_id: Option<u32>,
    ) -> Result<()> {
        "union".hash(hasher);
        for (index, type_id) in self.variants.iter().enumerate() {
            index.hash(hasher);
            TypeId(*type_id).hash_child_type(hasher, tg, runtime_id)?;
        }
        Ok(())
    }
}
