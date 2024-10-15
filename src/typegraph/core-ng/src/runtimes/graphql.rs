// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph as cm;
use indexmap::IndexMap;

use crate::{
    conversion::runtimes::MaterializerConverter,
    errors::Result,
    global_store::Store,
    typegraph::TypegraphContext,
    types::{
        core::{MaterializerId, RuntimeId},
        runtimes::{BaseMaterializer, Effect, GraphqlRuntimeData, MaterializerGraphqlQuery},
    },
};

use super::{Materializer, Runtime};

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
    ) -> Result<cm::Materializer> {
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
        Ok(cm::Materializer {
            name,
            runtime,
            effect: effect.into(),
            data,
        })
    }
}

pub fn register_graphql_runtime(data: GraphqlRuntimeData) -> Result<RuntimeId> {
    let runtime = Runtime::Graphql(data.into());
    Ok(Store::register_runtime(runtime))
}

pub fn graphql_query(
    base: BaseMaterializer,
    data: MaterializerGraphqlQuery,
) -> Result<MaterializerId> {
    let data = GraphqlMaterializer::Query(data);
    let mat = Materializer::graphql(base.runtime, data, base.effect);
    Ok(Store::register_materializer(mat))
}

pub fn graphql_mutation(
    base: BaseMaterializer,
    data: MaterializerGraphqlQuery,
) -> Result<MaterializerId> {
    let data = GraphqlMaterializer::Mutation(data);
    let mat = Materializer::graphql(base.runtime, data, base.effect);
    Ok(Store::register_materializer(mat))
}
