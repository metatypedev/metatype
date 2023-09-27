// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{StringFormat, StringTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::types::{gen_base, TypeConversion},
    errors,
    typegraph::TypegraphContext,
    types::{StringT, TypeData},
    wit::core::TypeString,
};

impl TypeConversion for StringT {
    fn convert(&self, _ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        let format: Option<StringFormat> = match self.data.format.clone() {
            Some(format) => {
                let ret =
                    serde_json::from_str(&format!("{:?}", format)).map_err(|e| e.to_string())?;
                Some(ret)
            }
            None => None,
        };

        Ok(TypeNode::String {
            base: gen_base(
                self.base
                    .name
                    .clone()
                    .unwrap_or_else(|| format!("string_{}", self.id.0)),
                self.base.runtime_config.clone(),
                runtime_id.unwrap(),
            )
            .enum_(self.data.enumeration.clone())
            .id(self.base.as_id)
            .build(),
            data: StringTypeData {
                min_length: self.data.min,
                max_length: self.data.max,
                pattern: self.data.pattern.to_owned(),
                format,
            },
        })
    }
}

impl TypeData for TypeString {
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

    fn variant_name(&self) -> String {
        "string".to_string()
    }
}
