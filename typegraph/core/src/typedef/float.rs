// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::types::{FloatTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::types::{BaseBuilderInit, TypeConversion},
    errors,
    typegraph::TypegraphContext,
    types::{Float, TypeDefData},
    wit::core::TypeFloat,
};

impl TypeConversion for Float {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        Ok(TypeNode::Float {
            base: BaseBuilderInit {
                ctx,
                base_name: "float",
                type_id: self.id,
                name: self.base.name.clone(),
                runtime_idx: runtime_id.unwrap(),
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .enum_(self.data.enumeration.as_deref())
            .inject(self.extended_base.injection.clone())?
            .build()?,
            data: FloatTypeData {
                minimum: self.data.min,
                maximum: self.data.max,
                exclusive_minimum: self.data.exclusive_minimum,
                exclusive_maximum: self.data.exclusive_maximum,
                multiple_of: self.data.multiple_of,
            },
        })
    }
}

impl TypeDefData for TypeFloat {
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
        "float"
    }
}
