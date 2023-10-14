// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::TypeNode;
use errors::Result;

use crate::{
    conversion::types::TypeConversion,
    errors,
    global_store::Store,
    typegraph::TypegraphContext,
    types::{Proxy, TypeData, TypeId, WrapperTypeData},
    wit::core::TypeProxy,
};

impl TypeConversion for Proxy {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        let tpe = self.id.resolve_proxy()?.as_type()?;
        tpe.convert(ctx, runtime_id)
    }
}

impl TypeData for TypeProxy {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("proxy_name='{}'", self.name));
    }

    fn variant_name(&self) -> String {
        "proxy".to_string()
    }

    super::impl_into_type!(wrapper, Proxy);
}

impl WrapperTypeData for TypeProxy {
    fn resolve(&self) -> Option<TypeId> {
        Store::get_type_by_name(&self.name)
    }

    fn try_resolve(&self) -> Result<TypeId> {
        self.resolve()
            .ok_or_else(|| format!("could not resolve proxy '{}'", self.name).into())
    }
}

impl TypeProxy {
    pub fn get_extra(&self, key: &str) -> Option<&str> {
        self.extras
            .iter()
            .find_map(|(k, v)| if k == key { Some(v.as_str()) } else { None })
    }
}
