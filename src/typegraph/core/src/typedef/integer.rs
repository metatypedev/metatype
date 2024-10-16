// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::hash::Hash as _;

use common::typegraph::{IntegerTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::{
        hash::Hashable,
        types::{BaseBuilderInit, TypeConversion},
    },
    errors,
    typegraph::TypegraphContext,
    types::{FindAttribute as _, Integer, RefAttrs, TypeDefData},
    wit::core::TypeInteger,
};

impl TypeConversion for Integer {
    fn convert(&self, ctx: &mut TypegraphContext, ref_attrs: &RefAttrs) -> Result<TypeNode> {
        Ok(TypeNode::Integer {
            base: BaseBuilderInit {
                ctx,
                base_name: "integer",
                type_id: self.id,
                name: self.base.name.clone(),
                policies: ref_attrs.find_policy().unwrap_or(&[]),
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .enum_(self.data.enumeration.as_deref())
            .inject(ref_attrs.find_injection())?
            .build()?,
            data: IntegerTypeData {
                minimum: self.data.min,
                maximum: self.data.max,
                exclusive_minimum: self.data.exclusive_minimum,
                exclusive_maximum: self.data.exclusive_maximum,
                multiple_of: self.data.multiple_of,
            },
        })
    }
}

impl TypeDefData for TypeInteger {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        if let Some(min) = self.min {
            params.push(format!("min={}", min));
        }
        if let Some(max) = self.max {
            params.push(format!("max={}", max));
        }
        if let Some(exclusive_minimum) = self.exclusive_minimum {
            params.push(format!("exclusiveMin={}", exclusive_minimum));
        }
        if let Some(exclusive_maximum) = self.exclusive_maximum {
            params.push(format!("exclusiveMax={}", exclusive_maximum));
        }
        if let Some(multiple_of) = self.multiple_of {
            params.push(format!("multipleOf={}", multiple_of));
        }
    }

    fn variant_name(&self) -> &'static str {
        "integer"
    }
}

impl Hashable for TypeInteger {
    fn hash(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        _tg: &mut TypegraphContext,
    ) -> Result<()> {
        "integer".hash(hasher);
        self.min.hash(hasher);
        self.max.hash(hasher);
        self.exclusive_minimum.hash(hasher);
        self.exclusive_maximum.hash(hasher);
        self.multiple_of.hash(hasher);
        if let Some(enumeration) = &self.enumeration {
            "enum".hash(hasher);
            enumeration.hash(hasher);
        }

        Ok(())
    }
}
