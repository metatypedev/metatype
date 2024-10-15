// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::Materializer;
use indexmap::IndexMap;

use crate::{
    conversion::runtimes::MaterializerConverter,
    errors::Result,
    typegraph::TypegraphContext,
    types::{
        core::RuntimeId,
        runtimes::{Effect, MaterializerGraphqlQuery},
    },
};

#[derive(Debug)]
pub enum GraphqlMaterializer {
    Query(MaterializerGraphqlQuery),
    Mutation(MaterializerGraphqlQuery),
}

impl MaterializerConverter for GraphqlMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: Effect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(runtime_id)?;
        let (name, data) = match self {
            GraphqlMaterializer::Query(d) => {
                let mut data = IndexMap::new();
                data.insert("path".to_string(), serde_json::to_value(&d.path).unwrap());
                ("query".to_string(), data)
            }
            GraphqlMaterializer::Mutation(d) => {
                let mut data = IndexMap::new();
                data.insert(
                    "path".to_string(),
                    serde_json::to_value(&d.path).unwrap(), // TODO error
                );
                ("mutation".to_string(), data)
            }
        };
        Ok(Materializer {
            name,
            runtime,
            effect: effect.into(),
            data,
        })
    }
}
