// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{EitherTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::types::{BaseBuilderInit, TypeConversion},
    errors,
    typegraph::TypegraphContext,
    types::{Either, TypeDefData, TypeId},
    wit::core::TypeEither,
};

impl TypeConversion for Either {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        Ok(TypeNode::Either {
            // TODO do we need to support injection??
            // TODO or emit an error if injection is set?
            // idem for as_id, and enum
            base: BaseBuilderInit {
                ctx,
                base_name: "either",
                type_id: self.id,
                name: self.base.name.clone(),
                runtime_idx: runtime_id.unwrap(),
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .inject(self.extended_base.injection.clone())?
            .build()?,
            data: EitherTypeData {
                one_of: self
                    .data
                    .variants
                    .iter()
                    .map(|&vid| -> Result<_> {
                        let (_, type_def) = TypeId(vid).resolve_ref()?;
                        Ok(ctx.register_type(type_def, runtime_id)?.into())
                    })
                    .collect::<Result<Vec<_>>>()?,
            },
        })
    }
}

impl TypeDefData for TypeEither {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        for (i, tpe_id) in self.variants.iter().enumerate() {
            params.push(format!("[v{}] => #{}", i, tpe_id));
        }
    }

    fn variant_name(&self) -> &'static str {
        "either"
    }
}
