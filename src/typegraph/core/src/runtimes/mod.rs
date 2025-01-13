// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod aws;
pub mod deno;
pub mod graphql;
pub mod grpc;
pub mod prisma;
pub mod python;
pub mod random;
pub mod substantial;
pub mod temporal;
pub mod typegate;
pub mod typegraph;
pub mod wasm;

use std::cell::RefCell;
use std::path::Path;
use std::rc::Rc;

use crate::conversion::runtimes::MaterializerConverter;
use crate::global_store::Store;
use crate::runtimes::prisma::migration::{
    prisma_apply, prisma_create, prisma_deploy, prisma_diff, prisma_reset,
};
use crate::runtimes::typegraph::TypegraphOperation;
use crate::sdk::aws::S3RuntimeData;
use crate::sdk::core::{FuncParams, MaterializerId, RuntimeId, TypeId as CoreTypeId};
use crate::sdk::runtimes::Effect as SdkEffect;
use crate::sdk::runtimes::{
    self as rt, BaseMaterializer, Effect, GraphqlRuntimeData, GrpcData, GrpcRuntimeData,
    HttpRuntimeData, KvMaterializer, KvRuntimeData, MaterializerHttpRequest, PrismaLinkData,
    PrismaMigrationOperation, PrismaRuntimeData, RandomRuntimeData, SubstantialRuntimeData,
    TemporalOperationData, TemporalRuntimeData, WasmRuntimeData,
};
use crate::t::TypeBuilder;
use crate::typegraph::current_typegraph_dir;
use crate::typegraph::TypegraphContext;
use crate::utils::fs::FsContext;
use crate::validation::types::validate_value;
use enum_dispatch::enum_dispatch;
use substantial::{substantial_operation, SubstantialMaterializer};

use self::aws::S3Materializer;
pub use self::deno::{DenoMaterializer, MaterializerDenoImport, MaterializerDenoModule};
pub use self::graphql::GraphqlMaterializer;
use self::grpc::{call_grpc_method, GrpcMaterializer};
use self::prisma::context::PrismaContext;
use self::prisma::get_prisma_context;
use self::prisma::relationship::prisma_link;
use self::prisma::type_generation::replace_variables_to_indices;
use self::prisma::PrismaMaterializer;
pub use self::python::PythonMaterializer;
pub use self::random::RandomMaterializer;
use self::temporal::temporal_operation;
pub use self::temporal::TemporalMaterializer;
use self::typegate::TypegateOperation;
pub use self::wasm::WasmMaterializer;
use crate::errors::Result;

#[derive(Debug, Clone)]
pub enum Runtime {
    Deno,
    Graphql(Rc<GraphqlRuntimeData>),
    Http(Rc<HttpRuntimeData>),
    Python,
    Random(Rc<RandomRuntimeData>),
    WasmWire(Rc<WasmRuntimeData>),
    WasmReflected(Rc<WasmRuntimeData>),
    Prisma(Rc<PrismaRuntimeData>, Rc<RefCell<PrismaContext>>),
    PrismaMigration,
    Temporal(Rc<TemporalRuntimeData>),
    Typegate,
    Typegraph,
    S3(Rc<S3RuntimeData>),
    Substantial(Rc<SubstantialRuntimeData>),
    Kv(Rc<KvRuntimeData>),
    Grpc(Rc<GrpcRuntimeData>),
}

#[derive(Debug, Clone)]
pub struct Materializer {
    pub runtime_id: RuntimeId,
    pub effect: Effect,
    pub data: MaterializerData,
}

impl Materializer {
    pub fn deno(data: DenoMaterializer, effect: Effect) -> Self {
        Self {
            runtime_id: Store::get_deno_runtime(),
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn graphql(runtime_id: RuntimeId, data: GraphqlMaterializer, effect: Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn http(runtime_id: RuntimeId, data: MaterializerHttpRequest, effect: Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn python(runtime_id: RuntimeId, data: PythonMaterializer, effect: Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn random(runtime_id: RuntimeId, data: RandomMaterializer, effect: Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn wasm(runtime_id: RuntimeId, data: WasmMaterializer, effect: Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn prisma(runtime_id: RuntimeId, data: PrismaMaterializer, effect: Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn prisma_migrate(
        runtime_id: RuntimeId,
        data: PrismaMigrationOperation,
        effect: Effect,
    ) -> Self {
        Self {
            runtime_id,
            effect,
            data: data.into(),
        }
    }

    fn temporal(runtime_id: RuntimeId, data: TemporalMaterializer, effect: Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn typegate(runtime_id: RuntimeId, data: TypegateOperation, effect: Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: data.into(),
        }
    }

    fn typegraph(runtime_id: RuntimeId, data: TypegraphOperation, effect: Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: data.into(),
        }
    }

    fn substantial(runtime_id: RuntimeId, data: SubstantialMaterializer, effect: Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn kv(runtime_id: RuntimeId, data: KvMaterializer, effect: Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn grpc(runtime_id: RuntimeId, data: GrpcMaterializer, effect: Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
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
    Wasm(Rc<WasmMaterializer>),
    Prisma(Rc<PrismaMaterializer>),
    PrismaMigration(PrismaMigrationOperation),
    Temporal(Rc<TemporalMaterializer>),
    Typegate(TypegateOperation),
    Typegraph(TypegraphOperation),
    S3(Rc<S3Materializer>),
    Substantial(Rc<SubstantialMaterializer>),
    Kv(Rc<KvMaterializer>),
    Grpc(Rc<GrpcMaterializer>),
}

macro_rules! prisma_op {
    ( $rt:expr, $model:expr, $op:ident, $name:expr, $effect:expr ) => {{
        let types = {
            let ctx = get_prisma_context($rt);
            let mut ctx = ctx.borrow_mut();
            ctx.generate_types(
                $crate::runtimes::prisma::type_generation::$op,
                $model.into(),
            )?
        };

        let mat = PrismaMaterializer {
            table: $crate::types::TypeId($model)
                .name()?
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
        prisma_op!($rt, $model, $fn, $name, Effect::Read)
    };
}

impl crate::sdk::runtimes::Handler for crate::Lib {
    fn get_deno_runtime() -> Result<RuntimeId> {
        Ok(Store::get_deno_runtime())
    }

    fn register_deno_func(
        data: rt::MaterializerDenoFunc,
        effect: Effect,
    ) -> Result<MaterializerId> {
        // TODO: check code is valid function?
        let mat = Materializer::deno(DenoMaterializer::Inline(data), effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_deno_static(
        data: rt::MaterializerDenoStatic,
        type_id: CoreTypeId,
    ) -> Result<MaterializerId> {
        validate_value(
            &serde_json::from_str::<serde_json::Value>(&data.value).map_err(|e| e.to_string())?,
            type_id.into(),
            "<V>".to_string(),
        )?;

        Ok(Store::register_materializer(Materializer::deno(
            DenoMaterializer::Static(deno::MaterializerDenoStatic {
                value: serde_json::from_str(&data.value).map_err(|e| e.to_string())?,
            }),
            Effect::Read,
        )))
    }

    fn get_predefined_deno_func(data: rt::MaterializerDenoPredefined) -> Result<MaterializerId> {
        Store::get_predefined_deno_function(data.name, data.param)
    }

    fn import_deno_function(
        data: rt::MaterializerDenoImport,
        effect: Effect,
    ) -> Result<MaterializerId> {
        let module = Store::get_deno_module(data.module, data.deps);
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
        data: rt::MaterializerGraphqlQuery,
    ) -> Result<MaterializerId> {
        let data = GraphqlMaterializer::Query(data);
        let mat = Materializer::graphql(base.runtime, data, base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn graphql_mutation(
        base: BaseMaterializer,
        data: rt::MaterializerGraphqlQuery,
    ) -> Result<MaterializerId> {
        let data = GraphqlMaterializer::Mutation(data);
        let mat = Materializer::graphql(base.runtime, data, base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_http_runtime(data: rt::HttpRuntimeData) -> Result<RuntimeId> {
        Ok(Store::register_runtime(Runtime::Http(data.into())))
    }

    fn http_request(
        base: rt::BaseMaterializer,
        data: rt::MaterializerHttpRequest,
    ) -> Result<MaterializerId> {
        let mat = Materializer::http(base.runtime, data, base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_python_runtime() -> Result<RuntimeId> {
        Ok(Store::register_runtime(Runtime::Python))
    }

    fn from_python_lambda(
        base: rt::BaseMaterializer,
        data: rt::MaterializerPythonLambda,
    ) -> Result<MaterializerId> {
        let mat = Materializer::python(base.runtime, PythonMaterializer::Lambda(data), base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn from_python_def(
        base: rt::BaseMaterializer,
        data: rt::MaterializerPythonDef,
    ) -> Result<MaterializerId> {
        let mat = Materializer::python(base.runtime, PythonMaterializer::Def(data), base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn from_python_module(
        base: rt::BaseMaterializer,
        data: rt::MaterializerPythonModule,
    ) -> Result<MaterializerId> {
        let mat = Materializer::python(base.runtime, PythonMaterializer::Module(data), base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn from_python_import(
        base: rt::BaseMaterializer,
        data: rt::MaterializerPythonImport,
    ) -> Result<MaterializerId> {
        let mat = Materializer::python(base.runtime, PythonMaterializer::Import(data), base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_random_runtime(data: rt::RandomRuntimeData) -> Result<MaterializerId> {
        Ok(Store::register_runtime(Runtime::Random(data.into())))
    }

    fn create_random_mat(
        base: rt::BaseMaterializer,
        data: rt::MaterializerRandom,
    ) -> Result<MaterializerId> {
        let mat =
            Materializer::random(base.runtime, RandomMaterializer::Runtime(data), base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_wasm_reflected_runtime(data: rt::WasmRuntimeData) -> Result<RuntimeId> {
        Ok(Store::register_runtime(Runtime::WasmReflected(data.into())))
    }

    fn register_wasm_wire_runtime(data: rt::WasmRuntimeData) -> Result<RuntimeId> {
        Ok(Store::register_runtime(Runtime::WasmWire(data.into())))
    }

    fn from_wasm_reflected_func(
        base: rt::BaseMaterializer,
        data: rt::MaterializerWasmReflectedFunc,
    ) -> Result<MaterializerId> {
        let mat = Materializer::wasm(
            base.runtime,
            WasmMaterializer::ReflectedFunc(data),
            base.effect,
        );
        Ok(Store::register_materializer(mat))
    }

    fn from_wasm_wire_handler(
        base: rt::BaseMaterializer,
        data: rt::MaterializerWasmWireHandler,
    ) -> Result<MaterializerId> {
        let mat = Materializer::wasm(
            base.runtime,
            WasmMaterializer::WireHandler(data),
            base.effect,
        );
        Ok(Store::register_materializer(mat))
    }

    fn register_prisma_runtime(data: rt::PrismaRuntimeData) -> Result<RuntimeId> {
        Ok(Store::register_runtime(Runtime::Prisma(
            data.into(),
            Default::default(),
        )))
    }

    fn prisma_find_unique(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
        prisma_op!(runtime, model, FindUnique, "findUnique")
    }

    fn prisma_find_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
        prisma_op!(runtime, model, FindMany, "findMany")
    }

    fn prisma_find_first(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
        prisma_op!(runtime, model, FindFirst, "findFirst")
    }

    fn prisma_aggregate(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
        prisma_op!(runtime, model, Aggregate, "aggregate")
    }

    fn prisma_group_by(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
        prisma_op!(runtime, model, GroupBy, "groupBy")
    }

    fn prisma_create_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
        prisma_op!(
            runtime,
            model,
            CreateOne,
            "createOne",
            Effect::Create(false)
        )
    }

    fn prisma_create_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
        prisma_op!(
            runtime,
            model,
            CreateMany,
            "createMany",
            Effect::Create(false)
        )
    }

    fn prisma_update_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
        prisma_op!(
            runtime,
            model,
            UpdateOne,
            "updateOne",
            Effect::Update(false)
        )
    }

    fn prisma_update_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
        prisma_op!(
            runtime,
            model,
            UpdateMany,
            "updateMany",
            Effect::Update(false)
        )
    }

    fn prisma_upsert_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
        prisma_op!(runtime, model, UpsertOne, "upsertOne", Effect::Update(true))
    }

    fn prisma_delete_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
        prisma_op!(runtime, model, DeleteOne, "deleteOne", Effect::Delete(true))
    }

    fn prisma_delete_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
        prisma_op!(
            runtime,
            model,
            DeleteMany,
            "deleteMany",
            Effect::Delete(true)
        )
    }

    fn prisma_execute(
        runtime: RuntimeId,
        query: String,
        param: CoreTypeId,
        effect: Effect,
    ) -> Result<FuncParams> {
        let types = {
            let ctx = get_prisma_context(runtime);
            let mut ctx = ctx.borrow_mut();
            ctx.execute_raw(param.into())?
        };
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
        out: CoreTypeId,
        param: Option<CoreTypeId>,
    ) -> Result<FuncParams> {
        let types = {
            let ctx = get_prisma_context(runtime);
            let mut ctx = ctx.borrow_mut();
            ctx.query_raw(param.map(|v| v.into()), out.into())?
        };
        let proc = replace_variables_to_indices(query, types.input)?;
        let mat = PrismaMaterializer {
            table: proc.query,
            operation: "queryRaw".to_string(),
            ordered_keys: Some(proc.ordered_keys),
        };
        let mat_id = Store::register_materializer(Materializer::prisma(runtime, mat, Effect::Read));
        Ok(FuncParams {
            inp: types.input.into(),
            out: types.output.into(),
            mat: mat_id,
        })
    }

    fn prisma_link(data: PrismaLinkData) -> Result<CoreTypeId> {
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

    fn prisma_migration(operation: PrismaMigrationOperation) -> Result<FuncParams> {
        use PrismaMigrationOperation as Op;

        let (effect, (inp, out)) = match operation {
            Op::Diff => (Effect::Read, prisma_diff()?),
            Op::Create => (Effect::Create(false), prisma_create()?),
            Op::Apply => (Effect::Update(false), prisma_apply()?),
            Op::Deploy => (Effect::Update(true), prisma_deploy()?),
            Op::Reset => (Effect::Delete(true), prisma_reset()?),
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

    fn register_temporal_runtime(data: TemporalRuntimeData) -> Result<RuntimeId> {
        Ok(Store::register_runtime(Runtime::Temporal(data.into())))
    }

    fn generate_temporal_operation(
        runtime: RuntimeId,
        data: TemporalOperationData,
    ) -> Result<FuncParams> {
        temporal_operation(runtime, data)
    }

    fn register_typegate_materializer(operation: rt::TypegateOperation) -> Result<MaterializerId> {
        use rt::TypegateOperation as SdkOP;
        use TypegateOperation as Op;

        let (effect, op) = match operation {
            SdkOP::ListTypegraphs => (Effect::Read, Op::ListTypegraphs),
            SdkOP::FindTypegraph => (Effect::Read, Op::FindTypegraph),
            SdkOP::AddTypegraph => (Effect::Create(true), Op::AddTypegraph),
            SdkOP::RemoveTypegraphs => (Effect::Delete(true), Op::RemoveTypegraphs),
            SdkOP::GetSerializedTypegraph => (Effect::Read, Op::GetSerializedTypegraph),
            SdkOP::GetArgInfoByPath => (Effect::Read, Op::GetArgInfoByPath),
            SdkOP::FindAvailableOperations => (Effect::Read, Op::FindAvailableOperations),
            SdkOP::FindPrismaModels => (Effect::Read, Op::FindPrismaModels),
            SdkOP::RawPrismaRead => (Effect::Read, Op::RawPrismaQuery),
            SdkOP::RawPrismaCreate => (Effect::Create(false), Op::RawPrismaQuery),
            SdkOP::RawPrismaUpdate => (Effect::Update(false), Op::RawPrismaQuery),
            SdkOP::RawPrismaDelete => (Effect::Delete(true), Op::RawPrismaQuery),
            SdkOP::QueryPrismaModel => (Effect::Read, Op::QueryPrismaModel),
        };

        Ok(Store::register_materializer(Materializer::typegate(
            Store::get_typegate_runtime(),
            op,
            effect,
        )))
    }

    fn register_typegraph_materializer(
        operation: rt::TypegraphOperation,
    ) -> Result<MaterializerId> {
        use rt::TypegraphOperation as SdkOP;
        use TypegraphOperation as Op;

        let (effect, op) = match operation {
            SdkOP::Resolver => (Effect::Read, Op::Resolver),
            SdkOP::GetType => (Effect::Read, Op::GetType),
            SdkOP::GetSchema => (Effect::Read, Op::GetSchema),
        };

        Ok(Store::register_materializer(Materializer::typegraph(
            Store::get_typegraph_runtime(),
            op,
            effect,
        )))
    }

    fn register_substantial_runtime(data: rt::SubstantialRuntimeData) -> Result<RuntimeId> {
        Ok(Store::register_runtime(Runtime::Substantial(data.into())))
    }

    fn generate_substantial_operation(
        runtime: RuntimeId,
        data: rt::SubstantialOperationData,
    ) -> Result<FuncParams> {
        substantial_operation(runtime, data)
    }

    fn register_kv_runtime(data: KvRuntimeData) -> Result<RuntimeId> {
        Ok(Store::register_runtime(Runtime::Kv(data.into())))
    }

    fn kv_operation(base: BaseMaterializer, data: KvMaterializer) -> Result<MaterializerId> {
        let mat = Materializer::kv(base.runtime, data, base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_grpc_runtime(data: GrpcRuntimeData) -> Result<RuntimeId> {
        let fs_ctx = FsContext::new(current_typegraph_dir()?);
        let proto_file = fs_ctx.read_text_file(Path::new(&data.proto_file))?;
        let data = GrpcRuntimeData { proto_file, ..data };

        Ok(Store::register_runtime(Runtime::Grpc(data.into())))
    }

    fn call_grpc_method(runtime: RuntimeId, data: GrpcData) -> Result<FuncParams> {
        call_grpc_method(runtime, data)
    }
}
