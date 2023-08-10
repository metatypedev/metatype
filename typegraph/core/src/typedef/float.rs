// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{FloatTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::types::{gen_base_enum, TypeConversion},
    errors,
    typegraph::TypegraphContext,
    types::{Float, TypeData},
    wit::core::TypeFloat,
};

impl TypeConversion for Float {
    fn convert(&self, _ctx: &mut TypegraphContext) -> Result<TypeNode> {
        let enumeration = self
            .data
            .enumeration
            .clone()
            .map(|enums| enums.iter().map(|v| format!("{}", v)).collect());
        Ok(TypeNode::Number {
            base: gen_base_enum(format!("float_{}", self.id), enumeration),
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

impl TypeData for TypeFloat {
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

    fn variant_name(&self) -> String {
        "float".to_string()
    }
}
