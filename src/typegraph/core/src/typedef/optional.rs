// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::hash::Hash as _;

use common::typegraph::{OptionalTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::{
        hash::Hashable,
        types::{BaseBuilderInit, TypeConversion},
    },
    errors,
    typegraph::TypegraphContext,
    types::{ExtendedTypeDef, FindAttribute as _, Optional, TypeDefData, TypeId},
    wit::core::TypeOptional,
};

impl TypeConversion for Optional {
    fn convert(&self, ctx: &mut TypegraphContext, xdef: ExtendedTypeDef) -> Result<TypeNode> {
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
                name: xdef.get_owned_name(),
                policies: xdef.attributes.find_policy().unwrap_or(&[]),
            }
            .init_builder()?
            .build()?,
            data: OptionalTypeData {
                item: ctx.register_type(TypeId(self.data.of))?.into(),
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

impl Hashable for TypeOptional {
    fn hash(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        tg: &mut TypegraphContext,
    ) -> Result<()> {
        self.default_item.hash(hasher);
        TypeId(self.of).hash_child_type(hasher, tg)?;
        Ok(())
    }
}
