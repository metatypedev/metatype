// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod deno;
pub mod graphql;
pub mod prisma;

use crate::conversion::runtimes::MaterializerConverter;
use crate::global_store::{with_store_mut, Store};
use crate::wit::runtimes::{
    BaseMaterializer, GraphqlRuntimeData, HttpRuntimeData, MaterializerHttpRequest,
};
use crate::{typegraph::TypegraphContext, wit::runtimes::Effect as WitEffect};
use crate::{
    wit::core::RuntimeId,
    wit::runtimes::{self as wit, Error as TgError},
};
use enum_dispatch::enum_dispatch;

pub use self::deno::{DenoMaterializer, MaterializerDenoImport, MaterializerDenoModule};
pub use self::graphql::GraphqlMaterializer;

type Result<T, E = TgError> = std::result::Result<T, E>;

#[derive(Debug)]
pub enum Runtime {
    Deno,
    Graphql(GraphqlRuntimeData),
    Http(HttpRuntimeData),
}

#[derive(Debug)]
pub struct Materializer {
    pub runtime_id: RuntimeId,
    pub effect: wit::Effect,
    pub data: MaterializerData,
}

impl Materializer {
    // fn new(base: wit::BaseMaterializer, data: impl Into<MaterializerData>) -> Self {
    //     Self {
    //         runtime_id: base.runtime,
    //         effect: base.effect,
    //         data: data.into(),
    //     }
    // }

    fn deno(data: DenoMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id: with_store_mut(|s| s.get_deno_runtime()),
            effect,
            data: data.into(),
        }
    }

    fn graphql(runtime_id: RuntimeId, data: GraphqlMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: data.into(),
        }
    }

    fn http(runtime_id: RuntimeId, data: MaterializerHttpRequest, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: data.into(),
        }
    }
}

#[derive(Debug)]
#[enum_dispatch]
pub enum MaterializerData {
    Deno(DenoMaterializer),
    GraphQL(GraphqlMaterializer),
    Http(MaterializerHttpRequest),
}

// impl From<DenoMaterializer> for MaterializerData {
//     fn from(mat: DenoMaterializer) -> Self {
//         Self::Deno(mat)
//     }
// }

impl crate::wit::runtimes::Runtimes for crate::Lib {
    fn get_deno_runtime() -> RuntimeId {
        with_store_mut(|s| s.get_deno_runtime())
    }

    fn register_deno_func(
        data: wit::MaterializerDenoFunc,
        effect: wit::Effect,
    ) -> Result<wit::MaterializerId> {
        // TODO: check code is valid function?
        let mat = Materializer::deno(DenoMaterializer::Inline(data), effect);
        Ok(with_store_mut(|s| s.register_materializer(mat)))
    }

    fn get_predefined_deno_func(
        data: wit::MaterializerDenoPredefined,
    ) -> Result<wit::MaterializerId> {
        with_store_mut(|s| s.get_predefined_deno_function(data.name))
    }

    fn import_deno_function(
        data: wit::MaterializerDenoImport,
        effect: wit::Effect,
    ) -> Result<wit::MaterializerId> {
        let module = with_store_mut(|s| s.get_deno_module(data.module));
        let data = MaterializerDenoImport {
            func_name: data.func_name,
            module,
            secrets: data.secrets,
        };
        let mat = Materializer::deno(DenoMaterializer::Import(data), effect);
        Ok(with_store_mut(|s| s.register_materializer(mat)))
    }

    fn register_graphql_runtime(data: GraphqlRuntimeData) -> Result<RuntimeId> {
        let runtime = Runtime::Graphql(data);
        Ok(with_store_mut(|s| s.register_runtime(runtime)))
    }

    fn graphql_query(
        base: BaseMaterializer,
        data: wit::MaterializerGraphqlQuery,
    ) -> Result<wit::MaterializerId> {
        let data = GraphqlMaterializer::Query(data);
        let mat = Materializer::graphql(base.runtime, data, base.effect);
        Ok(with_store_mut(|s| s.register_materializer(mat)))
    }

    fn graphql_mutation(
        base: BaseMaterializer,
        data: wit::MaterializerGraphqlQuery,
    ) -> Result<wit::MaterializerId> {
        let data = GraphqlMaterializer::Mutation(data);
        let mat = Materializer::graphql(base.runtime, data, base.effect);
        Ok(with_store_mut(|s| s.register_materializer(mat)))
    }

    fn register_http_runtime(
        data: crate::wit::runtimes::HttpRuntimeData,
    ) -> Result<crate::wit::runtimes::RuntimeId, crate::wit::runtimes::Error> {
        Ok(with_store_mut(|s| s.register_runtime(Runtime::Http(data))))
    }

    fn http_request(
        base: crate::wit::runtimes::BaseMaterializer,
        data: crate::wit::runtimes::MaterializerHttpRequest,
    ) -> Result<crate::wit::runtimes::MaterializerId, crate::wit::runtimes::Error> {
        let mat = Materializer::http(base.runtime, data, base.effect);
        Ok(with_store_mut(|s| s.register_materializer(mat)))
    }
}
