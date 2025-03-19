// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use indexmap::IndexMap;
use tg_schema::Materializer;

use crate::conversion::runtimes::MaterializerConverter;
use crate::errors::Result;
use crate::sdk::{
    core::RuntimeId,
    runtimes::{self as sdk},
};
use crate::typegraph::TypegraphContext;

#[derive(Debug)]
pub enum GraphqlMaterializer {
    Query(sdk::MaterializerGraphqlQuery),
    Mutation(sdk::MaterializerGraphqlQuery),
}

impl MaterializerConverter for GraphqlMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: sdk::Effect,
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
