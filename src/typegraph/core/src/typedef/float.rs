// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::hash::Hash as _;

use errors::Result;
use tg_schema::types::{FloatTypeData, TypeNode};

use crate::{
    conversion::{
        hash::Hashable,
        types::{BaseBuilderInit, TypeConversion},
    },
    errors,
    sdk::core::TypeFloat,
    typegraph::TypegraphContext,
    types::{ExtendedTypeDef, Float, TypeDefData},
};

impl TypeConversion for Float {
    fn convert(&self, _ctx: &mut TypegraphContext, xdef: ExtendedTypeDef) -> Result<TypeNode> {
        Ok(TypeNode::Float {
            base: BaseBuilderInit {
                base_name: "float",
                type_id: self.id,
                name: xdef.get_owned_name(),
            }
            .init_builder()?
            .enum_(self.data.enumeration.as_deref())
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

impl Hashable for TypeFloat {
    fn hash(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        _tg: &mut TypegraphContext,
    ) -> Result<()> {
        "float".hash(hasher);
        self.min.hash(hasher);
        self.max.hash(hasher);
        self.exclusive_minimum.hash(hasher);
        self.exclusive_maximum.hash(hasher);
        self.multiple_of.hash(hasher);

        if let Some(enumeration) = &self.enumeration {
            "enum".hash(hasher);
            for value in enumeration {
                (*value).hash(hasher);
            }
        }

        Ok(())
    }
}
