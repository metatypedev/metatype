// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{FunctionTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::types::{gen_base, TypeConversion},
    errors,
    global_store::with_store,
    typegraph::TypegraphContext,
    types::{Func, Type, TypeData},
    wit::core::TypeFunc,
};

impl TypeConversion for Func {
    fn convert(&self, ctx: &mut TypegraphContext, _runtime_id: Option<u32>) -> Result<TypeNode> {
        let (mat_id, runtime_id) =
            with_store(|s| -> Result<_> { ctx.register_materializer(s, self.data.mat) })?;

        let input = with_store(|s| -> Result<_> {
            let inp_id = s.resolve_proxy(self.data.inp)?;
            match s.get_type(inp_id)? {
                Type::Struct(_) => Ok(ctx.register_type(s, inp_id, Some(runtime_id))?),
                _ => Err(errors::invalid_input_type(&s.get_type_repr(inp_id)?)),
            }
        })?;

        let output = with_store(|s| -> Result<_> {
            let out_id = s.resolve_proxy(self.data.out)?;
            ctx.register_type(s, out_id, Some(runtime_id))
        })?;


        Ok(TypeNode::Function {
            base: gen_base(format!("func_{}", self.id), runtime_id),
            data: FunctionTypeData {
                input,
                output,
                materializer: mat_id,
                rate_calls: false,
                rate_weight: None,
            },
        })
    }
}

impl TypeData for TypeFunc {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("#{} => #{}", self.inp, self.out));
    }

    fn variant_name(&self) -> String {
        "func".to_string()
    }
}
