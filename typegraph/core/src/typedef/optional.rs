// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{OptionalTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::types::{BaseBuilderInit, TypeConversion},
    errors,
    typegraph::TypegraphContext,
    types::{Optional, TypeDefData, TypeId},
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
            base: BaseBuilderInit {
                ctx,
                base_name: "optional",
                type_id: self.id,
                name: self.base.name.clone(),
                runtime_idx: runtime_id.unwrap(),
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .inject(self.extended_base.injection.clone())?
            .build()?,
            data: OptionalTypeData {
                item: ctx
                    .register_type(TypeId(self.data.of).try_into()?, runtime_id)?
                    .into(),
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

impl TypeDefData for TypeOptional {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("item={}", self.of));
        if let Some(default) = self.default_item.clone() {
            params.push(format!("defaultItem={}", default));
        }
    }

    fn variant_name(&self) -> &'static str {
        "optional"
    }
}
