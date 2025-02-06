// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::hash::Hash;

use errors::Result;
use tg_schema::{StringFormat, StringTypeData, TypeNode};

use crate::{
    conversion::{
        hash::Hashable,
        types::{BaseBuilderInit, TypeConversion},
    },
    errors,
    sdk::core::TypeString,
    typegraph::TypegraphContext,
    types::{ExtendedTypeDef, StringT, TypeDefData},
};

impl TypeConversion for StringT {
    fn convert(&self, _ctx: &mut TypegraphContext, xdef: ExtendedTypeDef) -> Result<TypeNode> {
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
                base_name: "string",
                type_id: self.id,
                name: xdef.get_owned_name(),
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
