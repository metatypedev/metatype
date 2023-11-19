// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{FileTypeData, TypeNode};

use crate::conversion::types::{gen_base_concrete, TypeConversion};
use crate::errors::Result;
use crate::typegraph::TypegraphContext;
use crate::types::{File, TypeDefData};
use crate::wit::core::TypeFile;

impl TypeDefData for TypeFile {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        if let Some(min) = self.min {
            params.push(format!("min={}", min));
        }
        if let Some(max) = self.max {
            params.push(format!("max={}", max));
        }
        if let Some(allow) = self.allow.as_ref() {
            let allow = allow
                .iter()
                .map(|x| format!("{:?}", x))
                .collect::<Vec<_>>()
                .join(", ");
            params.push(format!("allow=[{}]", allow));
        }
    }

    fn variant_name(&self) -> &'static str {
        "file"
    }
}

impl TypeConversion for File {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        let policies = ctx.register_policy_chain(&self.extended_base.policies)?;
        Ok(TypeNode::File {
            // TODO should `as_id` be supported?
            base: gen_base_concrete!("file", self, runtime_id.unwrap(), policies),
            data: FileTypeData {
                min_size: self.data.min,
                max_size: self.data.max,
                mime_types: self.data.allow.clone(),
            },
        })
    }
}
