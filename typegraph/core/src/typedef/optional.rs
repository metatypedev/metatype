// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{OptionalTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::types::{gen_base, TypeConversion},
    errors,
    global_store::with_store,
    typegraph::TypegraphContext,
    types::{Optional, TypeData, TypeId},
    wit::core::TypeOptional,
};

impl TypeConversion for Optional {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        let default_value = match self.data.default_item.clone() {
            Some(value) => {
                let ret = serde_json::from_str(&value).map_err(|s| s.to_string())?;
                Some(ret)
            }
            None => None,
        };

        Ok(TypeNode::Optional {
            base: gen_base(
                self.base
                    .name
                    .clone()
                    .unwrap_or_else(|| format!("optional_{}", self.id.0)),
                self.base.runtime_config.clone(),
                runtime_id.unwrap(),
            )
            .build(),
            data: OptionalTypeData {
                item: with_store(|s| -> Result<_> {
                    let id = TypeId(self.data.of).resolve_proxy()?;
                    Ok(ctx.register_type(s, id, runtime_id)?.into())
                })?,
                default_value,
            },
        })
    }
}

impl Optional {
    pub fn item(&self) -> TypeId {
        TypeId(self.data.of)
    }
}

impl TypeData for TypeOptional {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("item={}", self.of));
        if let Some(default) = self.default_item.clone() {
            params.push(format!("defaultItem={}", default));
        }
    }

    fn variant_name(&self) -> String {
        "optional".to_string()
    }
}
