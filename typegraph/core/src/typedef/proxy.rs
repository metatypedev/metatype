// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::TypeNode;
use errors::Result;

use crate::{
    conversion::types::TypeConversion,
    errors,
    global_store::{with_store, Store},
    typegraph::TypegraphContext,
    types::{Proxy, Type, TypeData, WrapperTypeData},
    wit::core::TypeProxy,
};

impl TypeConversion for Proxy {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        with_store(|s| -> Result<_> {
            let tpe = s.resolve_proxy(self.id).and_then(|id| s.get_type(id))?;
            tpe.convert(ctx)
        })
    }
}

impl TypeData for TypeProxy {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("proxy_name='{}'", self.name));
    }

    fn variant_name(&self) -> String {
        "proxy".to_string()
    }
}

impl WrapperTypeData for TypeProxy {
    fn get_wrapped_type<'a>(&self, store: &'a Store) -> Option<&'a Type> {
        store
            .get_type_by_name(&self.name)
            .map(|id| store.get_type(id).unwrap())
    }
}
