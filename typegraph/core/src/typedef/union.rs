// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{TypeNode, UnionTypeData};
use errors::Result;

use crate::{
    conversion::types::{gen_base_concrete, TypeConversion},
    errors,
    typegraph::TypegraphContext,
    types::{TypeDefData, TypeId, Union},
    wit::core::TypeUnion,
};

impl TypeConversion for Union {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        let policies = ctx.register_policy_chain(&self.extended_base.policies)?;
        Ok(TypeNode::Union {
            base: gen_base_concrete!("union", self, runtime_id.unwrap(), policies),
            data: UnionTypeData {
                any_of: self
                    .data
                    .variants
                    .iter()
                    .map(|vid| -> Result<_> {
                        Ok(ctx
                            .register_type(TypeId(*vid).try_into()?, runtime_id)?
                            .into())
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
