// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::TypeNode;
use errors::Result;

use crate::{
    conversion::{
        hash::Hashable,
        types::{BaseBuilderInit, TypeConversion},
    },
    errors,
    typegraph::TypegraphContext,
    types::{Boolean, TypeBoolean, TypeDefData},
};
use std::hash::Hash;

impl TypeConversion for Boolean {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Boolean {
            base: BaseBuilderInit {
                ctx,
                base_name: "boolean",
                type_id: self.id,
                name: self.base.name.clone(),
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .inject(self.extended_base.injection.clone())?
            .build()?,
        })
    }
}

impl TypeDefData for TypeBoolean {
    fn get_display_params_into(&self, _params: &mut Vec<String>) {}

    fn variant_name(&self) -> &'static str {
        "boolean"
    }
}

impl Hashable for TypeBoolean {
    fn hash(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        _tg: &mut TypegraphContext,
    ) -> Result<()> {
        "boolean".hash(hasher);
        Ok(())
    }
}
