// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{FunctionTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::types::{BaseBuilderInit, TypeConversion},
    errors,
    typegraph::TypegraphContext,
    types::{Func, TypeDef, TypeDefData, TypeId},
    wit::core::TypeFunc,
};

impl TypeConversion for Func {
    fn convert(&self, ctx: &mut TypegraphContext, _runtime_id: Option<u32>) -> Result<TypeNode> {
        let (mat_id, runtime_id) = ctx.register_materializer(self.data.mat)?;

        let input = {
            let inp_id = TypeId(self.data.inp);
            match TypeId(self.data.inp).resolve_ref()?.1 {
                TypeDef::Struct(_) => Ok(ctx.register_type(inp_id.try_into()?, Some(runtime_id))?),
                _ => Err(errors::invalid_input_type(&inp_id.repr()?)),
            }
        }?
        .into();

        let out_type = TypeId(self.data.out).resolve_ref()?.1;
        let output = ctx.register_type(out_type, Some(runtime_id))?.into();

        Ok(TypeNode::Function {
            base: BaseBuilderInit {
                ctx,
                base_name: "func",
                type_id: self.id,
                name: self.base.name.clone(),
                runtime_idx: runtime_id,
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .build()?,
            data: FunctionTypeData {
                input,
                output,
                materializer: mat_id,
                rate_calls: self.data.rate_calls,
                rate_weight: self.data.rate_weight,
            },
        })
    }
}

impl TypeDefData for TypeFunc {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("#{} => #{}", self.inp, self.out));
    }

    fn variant_name(&self) -> &'static str {
        "func"
    }
}
