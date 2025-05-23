// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use indexmap::IndexMap;
use tg_schema::Materializer;

use crate::{
    conversion::runtimes::MaterializerConverter, errors::Result, sdk::runtimes::Effect,
    typegraph::TypegraphContext,
};

#[derive(Clone, Debug)]
pub enum TypegraphOperation {
    Resolver,
    GetType,
    GetSchema,
}

impl MaterializerConverter for TypegraphOperation {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: u32,
        effect: Effect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(runtime_id)?;

        Ok(Materializer {
            name: match self {
                Self::Resolver => "resolver",
                Self::GetType => "getType",
                Self::GetSchema => "getSchema",
            }
            .to_string(),
            runtime,
            effect: effect.into(),
            data: IndexMap::new(),
        })
    }
}
