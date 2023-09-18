// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod deno;
pub mod graphql;
pub mod prisma;
pub mod python;
pub mod random;
pub mod wasi;

use crate::conversion::runtimes::MaterializerConverter;
use crate::global_store::{with_store, with_store_mut, Store};
use crate::runtimes::prisma::with_prisma_runtime;
use crate::t;
use crate::wit::core::{RuntimeId, TypeId as CoreTypeId};
use crate::wit::runtimes::{
    self as wit, BaseMaterializer, Error as TgError, GraphqlRuntimeData, HttpRuntimeData,
    MaterializerHttpRequest, PrismaLinkData, PrismaRuntimeData, RandomRuntimeData,
};
use crate::{typegraph::TypegraphContext, wit::runtimes::Effect as WitEffect};
use enum_dispatch::enum_dispatch;

pub use self::deno::{DenoMaterializer, MaterializerDenoImport, MaterializerDenoModule};
pub use self::graphql::GraphqlMaterializer;
use self::prisma::relationship::registry::RelationshipRegistry;
use self::prisma::relationship::{prisma_link, prisma_linkn};
use self::prisma::{PrismaMaterializer, PrismaRuntimeContext};
pub use self::python::PythonMaterializer;
pub use self::random::RandomMaterializer;
pub use self::wasi::WasiMaterializer;

type Result<T, E = TgError> = std::result::Result<T, E>;

#[derive(Debug)]
pub enum Runtime {
    Deno,
    Graphql(GraphqlRuntimeData),
    Http(HttpRuntimeData),
    Python,
    Random(RandomRuntimeData),
    WasmEdge,
    Prisma(PrismaRuntimeData, PrismaRuntimeContext),
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

    fn python(runtime_id: RuntimeId, data: PythonMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: data.into(),
        }
    }

    fn random(runtime_id: RuntimeId, data: RandomMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: data.into(),
        }
    }

    fn wasi(runtime_id: RuntimeId, data: WasiMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: data.into(),
        }
    }

    fn prisma(runtime_id: RuntimeId, data: PrismaMaterializer, effect: wit::Effect) -> Self {
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
    Python(PythonMaterializer),
    Random(RandomMaterializer),
    WasmEdge(WasiMaterializer),
    Prisma(PrismaMaterializer),
}

// impl From<DenoMaterializer> for MaterializerData {
//     fn from(mat: DenoMaterializer) -> Self {
//         Self::Deno(mat)
//     }
// }

macro_rules! prisma_op {
    ( $rt:expr, $model:expr, $fn:ident, $name:expr, $effect:expr ) => {{
        let types = with_prisma_runtime($rt, |ctx| ctx.$fn($model.into()))?;

        let mat = PrismaMaterializer {
            table: with_store(|s| -> Result<_> {
                Ok(s.get_type_name($model.into())?
                    .map(|n| n.to_string())
                    .unwrap_or_else(|| "prisma model must be named".to_string()))
            })?,
            operation: $name.to_string(),
        };

        let mat_id =
            with_store_mut(|s| s.register_materializer(Materializer::prisma($rt, mat, $effect)));

        Ok(t::func(types.input, types.output, mat_id)?.into())
    }};

    ( $rt:expr, $model:expr, $fn:ident, $name:expr ) => {
        prisma_op!($rt, $model, $fn, $name, WitEffect::None)
    };
}

impl wit::Runtimes for crate::Lib {
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

    fn register_http_runtime(data: wit::HttpRuntimeData) -> Result<wit::RuntimeId, wit::Error> {
        Ok(with_store_mut(|s| s.register_runtime(Runtime::Http(data))))
    }

    fn http_request(
        base: wit::BaseMaterializer,
        data: wit::MaterializerHttpRequest,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::http(base.runtime, data, base.effect);
        Ok(with_store_mut(|s| s.register_materializer(mat)))
    }

    fn register_python_runtime() -> Result<wit::RuntimeId, wit::Error> {
        Ok(with_store_mut(|s| s.register_runtime(Runtime::Python)))
    }

    fn from_python_lambda(
        base: wit::BaseMaterializer,
        data: wit::MaterializerPythonLambda,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::python(base.runtime, PythonMaterializer::Lambda(data), base.effect);
        Ok(with_store_mut(|s| s.register_materializer(mat)))
    }

    fn from_python_def(
        base: wit::BaseMaterializer,
        data: wit::MaterializerPythonDef,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::python(base.runtime, PythonMaterializer::Def(data), base.effect);
        Ok(with_store_mut(|s| s.register_materializer(mat)))
    }

    fn from_python_module(
        base: wit::BaseMaterializer,
        data: wit::MaterializerPythonModule,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::python(base.runtime, PythonMaterializer::Module(data), base.effect);
        Ok(with_store_mut(|s| s.register_materializer(mat)))
    }

    fn from_python_import(
        base: wit::BaseMaterializer,
        data: wit::MaterializerPythonImport,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::python(base.runtime, PythonMaterializer::Import(data), base.effect);
        Ok(with_store_mut(|s| s.register_materializer(mat)))
    }

    fn register_random_runtime(
        data: wit::RandomRuntimeData,
    ) -> Result<wit::MaterializerId, wit::Error> {
        Ok(with_store_mut(|s| {
            s.register_runtime(Runtime::Random(data))
        }))
    }

    fn create_random_mat(
        base: wit::BaseMaterializer,
        data: wit::MaterializerRandom,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat =
            Materializer::random(base.runtime, RandomMaterializer::Runtime(data), base.effect);
        Ok(with_store_mut(|s| s.register_materializer(mat)))
    }

    fn register_wasmedge_runtime() -> Result<wit::RuntimeId, wit::Error> {
        Ok(with_store_mut(|s| s.register_runtime(Runtime::WasmEdge)))
    }

    fn from_wasi_module(
        base: wit::BaseMaterializer,
        data: wit::MaterializerWasi,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::wasi(base.runtime, WasiMaterializer::Module(data), base.effect);
        Ok(with_store_mut(|s| s.register_materializer(mat)))
    }

    fn register_prisma_runtime(data: wit::PrismaRuntimeData) -> Result<wit::RuntimeId, wit::Error> {
        Ok(with_store_mut(|s| {
            s.register_runtime(Runtime::Prisma(data, Default::default()))
        }))
    }

    fn prisma_find_unique(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(runtime, model, find_unique, "findUnique")
    }

    fn prisma_find_many(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(runtime, model, find_many, "findMany")
    }

    fn prisma_find_first(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(runtime, model, find_first, "findFirst")
    }

    fn prisma_aggregate(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(runtime, model, aggregate, "aggregate")
    }

    fn prisma_group_by(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(runtime, model, group_by, "groupBy")
    }

    fn prisma_count(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(runtime, model, count, "count")
    }

    fn prisma_create_one(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(
            runtime,
            model,
            create_one,
            "createOne",
            WitEffect::Create(false)
        )
    }

    fn prisma_create_many(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(
            runtime,
            model,
            create_many,
            "createMany",
            WitEffect::Create(false)
        )
    }

    fn prisma_update_one(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(
            runtime,
            model,
            update_one,
            "updateOne",
            WitEffect::Update(false)
        )
    }

    fn prisma_update_many(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(
            runtime,
            model,
            update_many,
            "updateMany",
            WitEffect::Update(false)
        )
    }

    fn prisma_upsert_one(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(
            runtime,
            model,
            upsert_one,
            "upsertOne",
            WitEffect::Update(true)
        )
    }

    fn prisma_delete_one(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(
            runtime,
            model,
            delete_one,
            "deleteOne",
            WitEffect::Delete(true)
        )
    }

    fn prisma_delete_many(runtime: RuntimeId, model: CoreTypeId) -> Result<CoreTypeId, wit::Error> {
        prisma_op!(
            runtime,
            model,
            delete_many,
            "deleteMany",
            WitEffect::Delete(true)
        )
    }

    fn prisma_link(data: PrismaLinkData) -> Result<CoreTypeId, wit::Error> {
        let mut builder = prisma_link(data.target_type.into())?;
        if let Some(name) = data.relationship_name {
            builder = builder.name(name);
        }
        if let Some(fkey) = data.foreign_key {
            builder = builder.fkey(fkey);
        }
        if let Some(field) = data.target_field {
            builder = builder.field(field);
        }
        Ok(builder.build()?.into())
    }
}
