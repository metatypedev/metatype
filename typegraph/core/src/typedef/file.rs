// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{FileTypeData, TypeNode};

use crate::conversion::types::{gen_base, TypeConversion};
use crate::errors::Result;
use crate::typegraph::TypegraphContext;
use crate::types::{File, TypeData};
use crate::wit::core::TypeFile;

impl TypeData for TypeFile {
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

    fn variant_name(&self) -> String {
        "file".to_string()
    }

    super::impl_into_type!(concrete, File);
}

impl TypeConversion for File {
    fn convert(&self, _ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        Ok(TypeNode::File {
            base: gen_base(
                self.base
                    .name
                    .clone()
                    .unwrap_or_else(|| format!("file_{}", self.id.0)),
                self.base.runtime_config.clone(),
                runtime_id.unwrap(),
            )
            .id(self.base.as_id)
            .build(),
            data: FileTypeData {
                min_size: self.data.min,
                max_size: self.data.max,
                mime_types: self.data.allow.clone(),
            },
        })
    }
}
