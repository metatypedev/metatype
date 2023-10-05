// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{TypeNode, UnionTypeData};
use errors::Result;

use crate::{
    conversion::types::{gen_base, TypeConversion},
    errors,
    typegraph::TypegraphContext,
    types::{TypeData, TypeId, Union},
    wit::core::TypeUnion,
};

impl TypeConversion for Union {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        Ok(TypeNode::Union {
            base: gen_base(
                self.base
                    .name
                    .clone()
                    .unwrap_or_else(|| format!("union_{}", self.id.0)),
                self.base.runtime_config.clone(),
                runtime_id.unwrap(),
            )
            .build(),
            data: UnionTypeData {
                any_of: self
                    .data
                    .variants
                    .iter()
                    .map(|vid| -> Result<_> {
                        let id = TypeId(*vid).resolve_proxy()?;
                        Ok(ctx.register_type(id, runtime_id)?.into())
                    })
                    .collect::<Result<Vec<_>>>()?,
            },
        })
    }
}

impl TypeData for TypeUnion {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        for (i, tpe_id) in self.variants.iter().enumerate() {
            params.push(format!("[v{}] => #{}", i, tpe_id));
        }
    }

    fn variant_name(&self) -> String {
        "union".to_string()
    }

    super::impl_into_type!(concrete, Union);
}
