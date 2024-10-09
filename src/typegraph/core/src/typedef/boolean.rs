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
    types::{Boolean, RefAttrs, TypeBoolean, TypeDefData},
};
use std::hash::Hash;

impl TypeConversion for Boolean {
    fn convert(
        &self,
        ctx: &mut TypegraphContext,
        runtime_id: Option<u32>,
        ref_attrs: &RefAttrs,
    ) -> Result<TypeNode> {
        Ok(TypeNode::Boolean {
            base: BaseBuilderInit {
                ctx,
                base_name: "boolean",
                type_id: self.id,
                name: self.base.name.clone(),
                runtime_idx: runtime_id.unwrap(),
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .inject(ref_attrs.injection.as_ref())?
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
        _runtime_id: Option<u32>,
    ) -> Result<()> {
        "boolean".hash(hasher);
        Ok(())
    }
}
