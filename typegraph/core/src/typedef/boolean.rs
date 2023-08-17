// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::TypeNode;
use errors::Result;

use crate::{
    conversion::types::{gen_base, TypeConversion},
    errors,
    typegraph::TypegraphContext,
    types::{Boolean, TypeBoolean, TypeData},
};

impl TypeConversion for Boolean {
    fn convert(&self, _ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Boolean {
            base: gen_base(
                format!("boolean_{}", self.id),
                self.base.runtime_config.clone(),
                None,
            ),
        })
    }
}

impl TypeData for TypeBoolean {
    fn get_display_params_into(&self, _params: &mut Vec<String>) {}

    fn variant_name(&self) -> String {
        "boolean".to_string()
    }
}
