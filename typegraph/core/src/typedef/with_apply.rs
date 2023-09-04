// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    conversion::types::TypeConversion,
    errors::Result,
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
            let type_node = tpe.convert(ctx, runtime_id)?;
            // TODO:
            // self.data.tpe_apply;
            Ok(type_node)
        })
    }
}

impl TypeData for TypeFuncWithApply {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("apply='[{}]'", "TODO"));
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
