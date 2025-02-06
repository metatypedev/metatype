// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::hash::Hash as _;

use tg_schema::{FileTypeData, TypeNode};

use crate::conversion::hash::Hashable;
use crate::conversion::types::{BaseBuilderInit, TypeConversion};
use crate::errors::Result;
use crate::sdk::core::TypeFile;
use crate::typegraph::TypegraphContext;
use crate::types::{ExtendedTypeDef, File, TypeDefData};

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

impl Hashable for TypeFile {
    fn hash(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        _tg: &mut TypegraphContext,
    ) -> Result<()> {
        self.min.hash(hasher);
        self.max.hash(hasher);
        self.allow.hash(hasher);
        Ok(())
    }
}

impl TypeConversion for File {
    fn convert(&self, _ctx: &mut TypegraphContext, xdef: ExtendedTypeDef) -> Result<TypeNode> {
        Ok(TypeNode::File {
            // TODO should `as_id` be supported?
            base: BaseBuilderInit {
                base_name: "file",
                type_id: self.id,
                name: xdef.get_owned_name(),
            }
            .init_builder()?
            .build()?,
            data: FileTypeData {
                min_size: self.data.min,
                max_size: self.data.max,
                mime_types: self.data.allow.clone(),
            },
        })
    }
}
