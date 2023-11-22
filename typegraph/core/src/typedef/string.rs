// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{StringFormat, StringTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::types::{BaseBuilderInit, TypeConversion},
    errors,
    typegraph::TypegraphContext,
    types::{StringT, TypeDefData},
    wit::core::TypeString,
};

impl TypeConversion for StringT {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
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
                name: self.base.name.clone(),
                runtime_idx: runtime_id.unwrap(),
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .enum_(self.data.enumeration.as_deref())
            .inject(self.extended_base.injection.clone())?
            .id(self.base.as_id)
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
