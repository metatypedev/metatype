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
    types::{Either, TypeDefData, TypeId},
    wit::core::TypeEither,
};

impl TypeConversion for Either {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Either {
            // TODO do we need to support injection??
            // TODO or emit an error if injection is set?
            // idem for as_id, and enum
            base: BaseBuilderInit {
                ctx,
                base_name: "either",
                type_id: self.id,
                name: self.base.name.clone(),
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .inject(self.extended_base.injection.clone())?
            .build()?,
            data: EitherTypeData {
                one_of: self
                    .data
                    .variants
                    .iter()
                    .map(|&vid| -> Result<_> {
                        let (_, type_def) = TypeId(vid).resolve_ref()?;
                        Ok(ctx.register_type(type_def)?.into())
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
    ) -> Result<()> {
        "either".hash(hasher);
        for (index, type_id) in self.variants.iter().enumerate() {
            index.hash(hasher);
            TypeId(*type_id).hash_child_type(hasher, tg)?;
        }
        Ok(())
    }
}
