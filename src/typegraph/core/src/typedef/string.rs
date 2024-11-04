// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::hash::Hash;

use common::typegraph::{StringFormat, StringTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::{
        hash::Hashable,
        types::{BaseBuilderInit, TypeConversion},
    },
    errors,
    typegraph::TypegraphContext,
    types::{ExtendedTypeDef, FindAttribute as _, StringT, TypeDefData},
    wit::core::TypeString,
};

impl TypeConversion for StringT {
    fn convert(&self, ctx: &mut TypegraphContext, xdef: ExtendedTypeDef) -> Result<TypeNode> {
        let format: Option<StringFormat> = match self.data.format.clone() {
            Some(format) => {
                let ret =
                    serde_json::from_str(&format!("{:?}", format)).map_err(|e| e.to_string())?;
                Some(ret)
            }
            None => None,
        };

        Ok(TypeNode::String {
            base: BaseBuilderInit {
                ctx,
                base_name: "string",
                type_id: self.id,
                name: xdef.get_owned_name(),
                policies: xdef.attributes.find_policy().unwrap_or(&[]),
            }
            .init_builder()?
            .enum_(self.data.enumeration.as_deref())
            .build()?,
            data: StringTypeData {
                min_length: self.data.min,
                max_length: self.data.max,
                pattern: self.data.pattern.to_owned(),
                format,
            },
        })
    }
}

impl TypeDefData for TypeString {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        if let Some(min) = self.min {
            params.push(format!("min={}", min));
        }
        if let Some(max) = self.max {
            params.push(format!("max={}", max));
        }
        if let Some(pattern) = self.pattern.as_ref() {
            params.push(format!("pattern={}", pattern));
        }
        if let Some(format) = self.format.to_owned() {
            params.push(format!("format={}", format));
        }
    }

    fn variant_name(&self) -> &'static str {
        "string"
    }
}

impl Hashable for TypeString {
    fn hash(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        _tg: &mut TypegraphContext,
    ) -> Result<()> {
        "string".hash(hasher);
        self.min.hash(hasher);
        self.max.hash(hasher);
        self.pattern.hash(hasher);
        self.format.hash(hasher);

        if let Some(enumeration) = self.enumeration.as_ref() {
            "enum".hash(hasher);
            enumeration.hash(hasher);
        }

        Ok(())
    }
}
