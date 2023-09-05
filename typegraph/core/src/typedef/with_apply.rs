// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::borrow::BorrowMut;

use crate::{
    conversion::types::TypeConversion,
    errors::{self, Result},
    global_store::{with_store, Store},
    typegraph::TypegraphContext,
    types::{Type, TypeData, WithApply, WrapperTypeData},
    wit::core::TypeFuncWithApply,
};
use common::typegraph::TypeNode;

impl TypeConversion for WithApply {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        with_store(|s| -> Result<_> {
            let tpe = s.get_type(self.data.tpe_func)?;
            let mut type_node = tpe.convert(ctx, runtime_id)?;
            match type_node.borrow_mut() {
                TypeNode::Function { data, .. } => {
                    data.input = build_applied_input(data.input, self.data.apply_value.clone())
                }
                _ => return Err(errors::expected_typenode_func(type_node.type_name())),
            }
            Ok(type_node)
        })
    }
}

impl TypeData for TypeFuncWithApply {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("apply='[{}]'", self.apply_value));
    }

    fn variant_name(&self) -> String {
        "apply".to_string()
    }
}

impl WrapperTypeData for TypeFuncWithApply {
    fn get_wrapped_type<'a>(&self, store: &'a Store) -> Option<&'a Type> {
        store.get_type(self.tpe_func).ok()
    }
}

fn build_applied_input(input_id: u32, _apply_value: String) -> u32 {
    input_id // should be new id
}
