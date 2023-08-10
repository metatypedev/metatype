// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{TypeNode, UnionTypeData};
use errors::Result;

use crate::{
    conversion::types::{gen_base, TypeConversion},
    errors,
    global_store::with_store,
    typegraph::TypegraphContext,
    types::{TypeData, Union},
    wit::core::TypeUnion,
};

impl TypeConversion for Union {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Union {
            base: gen_base(format!("union_{}", self.id)),
            data: UnionTypeData {
                any_of: self
                    .data
                    .variants
                    .iter()
                    .map(|vid| {
                        with_store(|s| -> Result<_> {
                            let id = s.resolve_proxy(*vid)?;
                            ctx.register_type(s, id)
                        })
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
}
