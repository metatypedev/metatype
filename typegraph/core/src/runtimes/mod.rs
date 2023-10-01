// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod aws;
pub mod deno;
pub mod graphql;
pub mod prisma;
pub mod python;
pub mod random;
pub mod temporal;
pub mod typegate;
pub mod typegraph;
pub mod wasi;

use std::rc::Rc;

use crate::conversion::runtimes::MaterializerConverter;
use crate::global_store::Store;
use crate::runtimes::prisma::migration::{
    prisma_apply, prisma_create, prisma_deploy, prisma_diff, prisma_reset,
};
use crate::runtimes::prisma::with_prisma_runtime;
use crate::runtimes::typegraph::TypegraphOperation;
use crate::validation::types::validate_value;
use crate::wit::aws::S3RuntimeData;
use crate::wit::core::{FuncParams, MaterializerId, RuntimeId, TypeId as CoreTypeId};
use crate::wit::runtimes::{
    self as wit, BaseMaterializer, Error as TgError, GraphqlRuntimeData, HttpRuntimeData,
    MaterializerHttpRequest, PrismaLinkData, PrismaMigrationOperation, PrismaRuntimeData,
    RandomRuntimeData, TemporalOperationData, TemporalRuntimeData,
};
use crate::{typegraph::TypegraphContext, wit::runtimes::Effect as WitEffect};
use enum_dispatch::enum_dispatch;

use self::aws::S3Materializer;
pub use self::deno::{DenoMaterializer, MaterializerDenoImport, MaterializerDenoModule};
pub use self::graphql::GraphqlMaterializer;
use self::prisma::relationship::prisma_link;
use self::prisma::type_generation::replace_variables_to_indices;
use self::prisma::{PrismaMaterializer, PrismaRuntimeContext};
pub use self::python::PythonMaterializer;
pub use self::random::RandomMaterializer;
use self::temporal::temporal_operation;
pub use self::temporal::TemporalMaterializer;
use self::typegate::TypegateOperation;
pub use self::wasi::WasiMaterializer;

type Result<T, E = TgError> = std::result::Result<T, E>;

#[derive(Debug, Clone)]
pub enum Runtime {
    Deno,
    Graphql(Rc<GraphqlRuntimeData>),
    Http(Rc<HttpRuntimeData>),
    Python,
    Random(Rc<RandomRuntimeData>),
    WasmEdge,
    Prisma(Rc<PrismaRuntimeData>, Rc<PrismaRuntimeContext>),
    PrismaMigration,
    Temporal(Rc<TemporalRuntimeData>),
    Typegate,
    Typegraph,
    S3(Rc<S3RuntimeData>),
}

#[derive(Debug, Clone)]
pub struct Materializer {
    pub runtime_id: RuntimeId,
    pub effect: wit::Effect,
    pub data: MaterializerData,
}

impl Materializer {
    fn deno(data: DenoMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id: Store::get_deno_runtime(),
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn graphql(runtime_id: RuntimeId, data: GraphqlMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn http(runtime_id: RuntimeId, data: MaterializerHttpRequest, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn python(runtime_id: RuntimeId, data: PythonMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn random(runtime_id: RuntimeId, data: RandomMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn wasi(runtime_id: RuntimeId, data: WasiMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn prisma(runtime_id: RuntimeId, data: PrismaMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn prisma_migrate(
        runtime_id: RuntimeId,
        data: PrismaMigrationOperation,
        effect: wit::Effect,
    ) -> Self {
        Self {
            runtime_id,
            effect,
            data: data.into(),
        }
    }

    fn temporal(runtime_id: RuntimeId, data: TemporalMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn typegate(runtime_id: RuntimeId, data: TypegateOperation, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: data.into(),
        }
    }

    fn typegraph(runtime_id: RuntimeId, data: TypegraphOperation, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: data.into(),
        }
    }
}

#[derive(Debug, Clone)]
#[enum_dispatch]
pub enum MaterializerData {
    Deno(Rc<DenoMaterializer>),
    GraphQL(Rc<GraphqlMaterializer>),
    Http(Rc<MaterializerHttpRequest>),
    Python(Rc<PythonMaterializer>),
    Random(Rc<RandomMaterializer>),
    WasmEdge(Rc<WasiMaterializer>),
    Prisma(Rc<PrismaMaterializer>),
    PrismaMigration(PrismaMigrationOperation),
    Temporal(Rc<TemporalMaterializer>),
    Typegate(TypegateOperation),
    Typegraph(TypegraphOperation),
    S3(Rc<S3Materializer>),
}

macro_rules! prisma_op {
    ( $rt:expr, $model:expr, $fn:ident, $name:expr, $effect:expr ) => {{
        let types = with_prisma_runtime($rt, |ctx| ctx.$fn($model.into()))?;

        let mat = PrismaMaterializer {
            table: $crate::types::TypeId($model)
                .type_name()?
                .ok_or_else(|| "prisma model must be named".to_string())?,
            operation: $name.to_string(),
            ordered_keys: None,
        };

        let mat_id = Store::register_materializer(Materializer::prisma($rt, mat, $effect));

        Ok(FuncParams {
            inp: types.input.into(),
            out: types.output.into(),
            mat: mat_id,
        })
    }};

    ( $rt:expr, $model:expr, $fn:ident, $name:expr ) => {
        prisma_op!($rt, $model, $fn, $name, WitEffect::None)
    };
}

impl wit::Runtimes for crate::Lib {
    fn get_deno_runtime() -> RuntimeId {
        Store::get_deno_runtime()
    }

    fn register_deno_func(
        data: wit::MaterializerDenoFunc,
        effect: wit::Effect,
    ) -> Result<wit::MaterializerId> {
        // TODO: check code is valid function?
        let mat = Materializer::deno(DenoMaterializer::Inline(data), effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_deno_static(
        data: wit::MaterializerDenoStatic,
        type_id: CoreTypeId,
    ) -> Result<wit::MaterializerId> {
        validate_value(
            serde_json::from_str::<serde_json::Value>(&data.value).map_err(|e| e.to_string())?,
            type_id.into(),
            "<V>".to_string(),
        )?;

        Ok(Store::register_materializer(Materializer::deno(
            DenoMaterializer::Static(deno::MaterializerDenoStatic {
                value: serde_json::from_str(&data.value).map_err(|e| e.to_string())?,
            }),
            wit::Effect::None,
        )))
    }

    fn get_predefined_deno_func(
        data: wit::MaterializerDenoPredefined,
    ) -> Result<wit::MaterializerId> {
        Store::get_predefined_deno_function(data.name)
    }

    fn import_deno_function(
        data: wit::MaterializerDenoImport,
        effect: wit::Effect,
    ) -> Result<wit::MaterializerId> {
        let module = Store::get_deno_module(data.module);
        let data = MaterializerDenoImport {
            func_name: data.func_name,
            module,
            secrets: data.secrets,
        };
        let mat = Materializer::deno(DenoMaterializer::Import(data), effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_graphql_runtime(data: GraphqlRuntimeData) -> Result<RuntimeId> {
        let runtime = Runtime::Graphql(data.into());
        Ok(Store::register_runtime(runtime))
    }

    fn graphql_query(
        base: BaseMaterializer,
        data: wit::MaterializerGraphqlQuery,
    ) -> Result<wit::MaterializerId> {
        let data = GraphqlMaterializer::Query(data);
        let mat = Materializer::graphql(base.runtime, data, base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn graphql_mutation(
        base: BaseMaterializer,
        data: wit::MaterializerGraphqlQuery,
    ) -> Result<wit::MaterializerId> {
        let data = GraphqlMaterializer::Mutation(data);
        let mat = Materializer::graphql(base.runtime, data, base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_http_runtime(data: wit::HttpRuntimeData) -> Result<wit::RuntimeId, wit::Error> {
        Ok(Store::register_runtime(Runtime::Http(data.into())))
    }

    fn http_request(
        base: wit::BaseMaterializer,
        data: wit::MaterializerHttpRequest,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::http(base.runtime, data, base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_python_runtime() -> Result<wit::RuntimeId, wit::Error> {
        Ok(Store::register_runtime(Runtime::Python))
    }

    fn from_python_lambda(
        base: wit::BaseMaterializer,
        data: wit::MaterializerPythonLambda,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::python(base.runtime, PythonMaterializer::Lambda(data), base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn from_python_def(
        base: wit::BaseMaterializer,
        data: wit::MaterializerPythonDef,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::python(base.runtime, PythonMaterializer::Def(data), base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn from_python_module(
        base: wit::BaseMaterializer,
        data: wit::MaterializerPythonModule,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::python(base.runtime, PythonMaterializer::Module(data), base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn from_python_import(
        base: wit::BaseMaterializer,
        data: wit::MaterializerPythonImport,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::python(base.runtime, PythonMaterializer::Import(data), base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_random_runtime(
        data: wit::RandomRuntimeData,
    ) -> Result<wit::MaterializerId, wit::Error> {
        Ok(Store::register_runtime(Runtime::Random(data.into())))
    }

    fn create_random_mat(
        base: wit::BaseMaterializer,
        data: wit::MaterializerRandom,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat =
            Materializer::random(base.runtime, RandomMaterializer::Runtime(data), base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_wasmedge_runtime() -> Result<wit::RuntimeId, wit::Error> {
        Ok(Store::register_runtime(Runtime::WasmEdge))
    }

    fn from_wasi_module(
        base: wit::BaseMaterializer,
        data: wit::MaterializerWasi,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::wasi(base.runtime, WasiMaterializer::Module(data), base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_prisma_runtime(data: wit::PrismaRuntimeData) -> Result<wit::RuntimeId, wit::Error> {
        Ok(Store::register_runtime(Runtime::Prisma(
            data.into(),
            Default::default(),
        )))
    }

    fn prisma_find_unique(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(runtime, model, find_unique, "findUnique")
    }

    fn prisma_find_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(runtime, model, find_many, "findMany")
    }

    fn prisma_find_first(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(runtime, model, find_first, "findFirst")
    }

    fn prisma_aggregate(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(runtime, model, aggregate, "aggregate")
    }

    fn prisma_group_by(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(runtime, model, group_by, "groupBy")
    }

    fn prisma_count(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(runtime, model, count, "count")
    }

    fn prisma_create_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            create_one,
            "createOne",
            WitEffect::Create(false)
        )
    }

    fn prisma_create_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            create_many,
            "createMany",
            WitEffect::Create(false)
        )
    }

    fn prisma_update_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            update_one,
            "updateOne",
            WitEffect::Update(false)
        )
    }

    fn prisma_update_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            update_many,
            "updateMany",
            WitEffect::Update(false)
        )
    }

    fn prisma_upsert_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            upsert_one,
            "upsertOne",
            WitEffect::Update(true)
        )
    }

    fn prisma_delete_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            delete_one,
            "deleteOne",
            WitEffect::Delete(true)
        )
    }

    fn prisma_delete_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            delete_many,
            "deleteMany",
            WitEffect::Delete(true)
        )
    }

    fn prisma_execute(
        runtime: RuntimeId,
        query: String,
        param: CoreTypeId,
        effect: WitEffect,
    ) -> Result<FuncParams, wit::Error> {
        let types = with_prisma_runtime(runtime, |ctx| ctx.execute_raw(param.into()))?;
        let proc = replace_variables_to_indices(query, types.input)?;
        let mat = PrismaMaterializer {
            table: proc.query,
            operation: "executeRaw".to_string(),
            ordered_keys: Some(proc.ordered_keys),
        };
        let mat_id = Store::register_materializer(Materializer::prisma(runtime, mat, effect));
        Ok(FuncParams {
            inp: types.input.into(),
            out: types.output.into(),
            mat: mat_id,
        })
    }

    fn prisma_query_raw(
        runtime: RuntimeId,
        query: String,
        param: Option<CoreTypeId>,
        out: CoreTypeId,
    ) -> Result<FuncParams, wit::Error> {
        let types = with_prisma_runtime(runtime, |ctx| {
            ctx.query_raw(param.map(|v| v.into()), out.into())
        })?;
        let proc = replace_variables_to_indices(query, types.input)?;
        let mat = PrismaMaterializer {
            table: proc.query,
            operation: "queryRaw".to_string(),
            ordered_keys: Some(proc.ordered_keys),
        };
        let mat_id =
            Store::register_materializer(Materializer::prisma(runtime, mat, WitEffect::None));
        Ok(FuncParams {
            inp: types.input.into(),
            out: types.output.into(),
            mat: mat_id,
        })
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
        if let Some(unique) = data.unique {
            builder = builder.unique(unique);
        }
        Ok(builder.build()?.into())
    }

    fn prisma_migration(operation: PrismaMigrationOperation) -> Result<FuncParams, wit::Error> {
        use PrismaMigrationOperation as Op;

        let (effect, (inp, out)) = match operation {
            Op::Diff => (WitEffect::None, prisma_diff()?),
            Op::Create => (WitEffect::Create(false), prisma_create()?),
            Op::Apply => (WitEffect::Update(false), prisma_apply()?),
            Op::Deploy => (WitEffect::Update(true), prisma_deploy()?),
            Op::Reset => (WitEffect::Delete(true), prisma_reset()?),
        };

        let mat_id = Store::register_materializer(Materializer::prisma_migrate(
            Store::get_prisma_migration_runtime(),
            operation,
            effect,
        ));

        Ok(FuncParams {
            inp: inp.into(),
            out: out.into(),
            mat: mat_id,
        })
    }

    fn register_temporal_runtime(data: TemporalRuntimeData) -> Result<RuntimeId, wit::Error> {
        Ok(Store::register_runtime(Runtime::Temporal(data.into())))
    }

    fn generate_temporal_operation(
        runtime: RuntimeId,
        data: TemporalOperationData,
    ) -> Result<FuncParams, wit::Error> {
        temporal_operation(runtime, data)
    }

    fn register_typegate_materializer(
        operation: wit::TypegateOperation,
    ) -> Result<MaterializerId, wit::Error> {
        use wit::TypegateOperation as WitOp;
        use TypegateOperation as Op;

        let (effect, op) = match operation {
            WitOp::ListTypegraphs => (WitEffect::None, Op::ListTypegraphs),
            WitOp::FindTypegraph => (WitEffect::None, Op::FindTypegraph),
            WitOp::AddTypegraph => (WitEffect::Create(true), Op::AddTypegraph),
            WitOp::RemoveTypegraph => (WitEffect::Delete(true), Op::RemoveTypegraph),
            WitOp::GetSerializedTypegraph => (WitEffect::None, Op::GetSerializedTypegraph),
        };

        Ok(Store::register_materializer(Materializer::typegate(
            Store::get_typegate_runtime(),
            op,
            effect,
        )))
    }

    fn register_typegraph_materializer(
        operation: wit::TypegraphOperation,
    ) -> Result<MaterializerId, wit::Error> {
        use wit::TypegraphOperation as WitOp;
        use TypegraphOperation as Op;

        let (effect, op) = match operation {
            WitOp::Resolver => (WitEffect::None, Op::Resolver),
            WitOp::GetType => (WitEffect::None, Op::GetType),
            WitOp::GetSchema => (WitEffect::None, Op::GetSchema),
        };

        Ok(Store::register_materializer(Materializer::typegraph(
            Store::get_typegraph_runtime(),
            op,
            effect,
        )))
    }
}
