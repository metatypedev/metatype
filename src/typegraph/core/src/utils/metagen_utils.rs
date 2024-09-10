// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::Typegraph;
use metagen::{GeneratorInputOrder, GeneratorInputResolved, InputResolverSync};

#[derive(Clone)]
pub struct RawTgResolver {
    pub tg: Typegraph,
}

impl InputResolverSync for RawTgResolver {
    fn resolve(
        &self,
        order: metagen::GeneratorInputOrder,
    ) -> color_eyre::Result<GeneratorInputResolved> {
        match order {
            GeneratorInputOrder::TypegraphFromTypegate { .. } => {
                Ok(GeneratorInputResolved::TypegraphFromTypegate {
                    raw: self.tg.clone().into(),
                })
            }
            _ => unimplemented!(),
        }
    }
}
