// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{EitherTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::types::{gen_base_concrete, TypeConversion},
    errors,
    typegraph::TypegraphContext,
    types::{Either, TypeData, TypeId},
    wit::core::TypeEither,
};

impl TypeConversion for Either {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        let policies = ctx.register_policy_chain(&self.extended_base.policies)?;
        Ok(TypeNode::Either {
            // TODO do we need to support injection??
            // TODO or emit an error if injection is set?
            // idem for as_id, and enum
            base: gen_base_concrete!("either", self, runtime_id.unwrap(), policies),
            data: EitherTypeData {
                one_of: self
                    .data
                    .variants
                    .iter()
                    .map(|&vid| -> Result<_> {
                        let id = TypeId(vid).resolve_proxy()?;
                        Ok(ctx.register_type(id, runtime_id)?.into())
                    })
                    .collect::<Result<Vec<_>>>()?,
            },
        })
    }
}

impl TypeData for TypeEither {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        for (i, tpe_id) in self.variants.iter().enumerate() {
            params.push(format!("[v{}] => #{}", i, tpe_id));
        }
    }

    fn variant_name(&self) -> String {
        "either".to_string()
    }

    super::impl_into_type!(concrete, Either);
}
