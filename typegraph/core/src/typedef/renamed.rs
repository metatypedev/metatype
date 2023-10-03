// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::TypeNode;

use crate::conversion::types::TypeConversion;
use crate::errors::Result;
use crate::typegraph::TypegraphContext;
use crate::types::{Renamed, TypeData, TypeId, WrapperTypeData};
use crate::wit::core::TypeRenamed;

impl TypeConversion for Renamed {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        let tpe = TypeId(self.data.tpe).as_type()?;
        let mut type_node = tpe.convert(ctx, runtime_id)?;
        type_node.base_mut().title = self.data.name.clone();
        Ok(type_node)
    }
}

impl TypeData for TypeRenamed {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("renamed='{}'", self.name));
    }

    fn variant_name(&self) -> String {
        "renamed".to_string()
    }
}

impl WrapperTypeData for TypeRenamed {
    fn resolve(&self) -> Option<TypeId> {
        Some(self.tpe.into())
    }
}
