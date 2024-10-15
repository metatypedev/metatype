// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::hash::Hash as _;

use common::typegraph::{EitherTypeData, TypeNode};
use errors::Result;

use crate::{
    conversion::{
        hash::Hashable,
        types::{BaseBuilderInit, TypeConversion},
    },
    errors,
    typegraph::TypegraphContext,
    types::core::TypeEither,
    types::{Either, FindAttribute as _, RefAttrs, TypeDefData, TypeId},
};

impl TypeConversion for Either {
    fn convert(
        &self,
        ctx: &mut TypegraphContext,
        runtime_id: Option<u32>,
        ref_attrs: &RefAttrs,
    ) -> Result<TypeNode> {
        Ok(TypeNode::Either {
            base: BaseBuilderInit {
                ctx,
                base_name: "either",
                type_id: self.id,
                name: self.base.name.clone(),
                runtime_idx: runtime_id.unwrap(),
                policies: ref_attrs.find_policy().unwrap_or(&[]),
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .inject(ref_attrs.find_injection())?
            .build()?,
            data: EitherTypeData {
                one_of: self
                    .data
                    .variants
                    .iter()
                    .map(|&vid| -> Result<_> {
                        Ok(ctx.register_type(TypeId(vid), runtime_id)?.into())
                    })
                    .collect::<Result<Vec<_>>>()?,
            },
        })
    }
}

impl TypeDefData for TypeEither {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        for (i, tpe_id) in self.variants.iter().enumerate() {
            params.push(format!("[v{}] => #{}", i, tpe_id));
        }
    }

    fn variant_name(&self) -> &'static str {
        "either"
    }
}

impl Hashable for TypeEither {
    fn hash(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        tg: &mut TypegraphContext,
        runtime_id: Option<u32>,
    ) -> Result<()> {
        "either".hash(hasher);
        for (index, type_id) in self.variants.iter().enumerate() {
            index.hash(hasher);
            TypeId(*type_id).hash_child_type(hasher, tg, runtime_id)?;
        }
        Ok(())
    }
}
