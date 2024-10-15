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
use crate::t::TypeBuilder;
use crate::typegraph::current_typegraph_dir;
use crate::utils::fs::FsContext;
use crate::validation::types::validate_value;
use crate::wit::aws::S3RuntimeData;
use crate::wit::core::{FuncParams, MaterializerId, RuntimeId, TypeId as CoreTypeId};
use crate::wit::runtimes::{
    self as wit, BaseMaterializer, Error as TgError, GraphqlRuntimeData, GrpcData, GrpcRuntimeData,
    HttpRuntimeData, KvMaterializer, KvRuntimeData, MaterializerHttpRequest, PrismaLinkData,
    PrismaMigrationOperation, PrismaRuntimeData, RandomRuntimeData, SubstantialRuntimeData,
    TemporalOperationData, TemporalRuntimeData, WasmRuntimeData,
};
use crate::{typegraph::TypegraphContext, wit::runtimes::Effect as WitEffect};
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

type Result<T, E = TgError> = std::result::Result<T, E>;

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
    pub effect: wit::Effect,
    pub data: MaterializerData,
}

impl Materializer {
    pub fn deno(data: DenoMaterializer, effect: wit::Effect) -> Self {
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

    fn wasm(runtime_id: RuntimeId, data: WasmMaterializer, effect: wit::Effect) -> Self {
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

    fn substantial(
        runtime_id: RuntimeId,
        data: SubstantialMaterializer,
        effect: wit::Effect,
    ) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn kv(runtime_id: RuntimeId, data: KvMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id,
            effect,
            data: Rc::new(data).into(),
        }
    }

    fn grpc(runtime_id: RuntimeId, data: GrpcMaterializer, effect: wit::Effect) -> Self {
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
        prisma_op!($rt, $model, $fn, $name, WitEffect::Read)
    };
}

impl crate::wit::runtimes::Guest for crate::Lib {
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
            &serde_json::from_str::<serde_json::Value>(&data.value).map_err(|e| e.to_string())?,
            type_id.into(),
            "<V>".to_string(),
        )?;

        Ok(Store::register_materializer(Materializer::deno(
            DenoMaterializer::Static(deno::MaterializerDenoStatic {
                value: serde_json::from_str(&data.value).map_err(|e| e.to_string())?,
            }),
            wit::Effect::Read,
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

    fn register_wasm_reflected_runtime(
        data: wit::WasmRuntimeData,
    ) -> Result<wit::RuntimeId, wit::Error> {
        Ok(Store::register_runtime(Runtime::WasmReflected(data.into())))
    }

    fn register_wasm_wire_runtime(
        data: wit::WasmRuntimeData,
    ) -> Result<wit::RuntimeId, wit::Error> {
        Ok(Store::register_runtime(Runtime::WasmWire(data.into())))
    }

    fn from_wasm_reflected_func(
        base: wit::BaseMaterializer,
        data: wit::MaterializerWasmReflectedFunc,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::wasm(
            base.runtime,
            WasmMaterializer::ReflectedFunc(data),
            base.effect,
        );
        Ok(Store::register_materializer(mat))
    }

    fn from_wasm_wire_handler(
        base: wit::BaseMaterializer,
        data: wit::MaterializerWasmWireHandler,
    ) -> Result<wit::MaterializerId, wit::Error> {
        let mat = Materializer::wasm(
            base.runtime,
            WasmMaterializer::WireHandler(data),
            base.effect,
        );
        Ok(Store::register_materializer(mat))
    }

    fn register_prisma_runtime(data: wit::PrismaRuntimeData) -> Result<wit::RuntimeId, wit::Error> {
        Ok(Store::register_runtime(Runtime::Prisma(
            data.into(),
            Default::default(),
        )))
    }

    fn prisma_find_unique(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(runtime, model, FindUnique, "findUnique")
    }

    fn prisma_find_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(runtime, model, FindMany, "findMany")
    }

    fn prisma_find_first(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(runtime, model, FindFirst, "findFirst")
    }

    fn prisma_aggregate(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(runtime, model, Aggregate, "aggregate")
    }

    fn prisma_count(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(runtime, model, Count, "count")
    }

    fn prisma_group_by(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(runtime, model, GroupBy, "groupBy")
    }

    fn prisma_create_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            CreateOne,
            "createOne",
            WitEffect::Create(false)
        )
    }

    fn prisma_create_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            CreateMany,
            "createMany",
            WitEffect::Create(false)
        )
    }

    fn prisma_update_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            UpdateOne,
            "updateOne",
            WitEffect::Update(false)
        )
    }

    fn prisma_update_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            UpdateMany,
            "updateMany",
            WitEffect::Update(false)
        )
    }

    fn prisma_upsert_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            UpsertOne,
            "upsertOne",
            WitEffect::Update(true)
        )
    }

    fn prisma_delete_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            DeleteOne,
            "deleteOne",
            WitEffect::Delete(true)
        )
    }

    fn prisma_delete_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams, wit::Error> {
        prisma_op!(
            runtime,
            model,
            DeleteMany,
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
        param: Option<CoreTypeId>,
        out: CoreTypeId,
    ) -> Result<FuncParams, wit::Error> {
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
        let mat_id =
            Store::register_materializer(Materializer::prisma(runtime, mat, WitEffect::Read));
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
            Op::Diff => (WitEffect::Read, prisma_diff()?),
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
            WitOp::ListTypegraphs => (WitEffect::Read, Op::ListTypegraphs),
            WitOp::FindTypegraph => (WitEffect::Read, Op::FindTypegraph),
            WitOp::AddTypegraph => (WitEffect::Create(true), Op::AddTypegraph),
            WitOp::RemoveTypegraphs => (WitEffect::Delete(true), Op::RemoveTypegraphs),
            WitOp::GetSerializedTypegraph => (WitEffect::Read, Op::GetSerializedTypegraph),
            WitOp::GetArgInfoByPath => (WitEffect::Read, Op::GetArgInfoByPath),
            WitOp::FindAvailableOperations => (WitEffect::Read, Op::FindAvailableOperations),
            WitOp::FindPrismaModels => (WitEffect::Read, Op::FindPrismaModels),
            WitOp::RawPrismaRead => (WitEffect::Read, Op::RawPrismaQuery),
            WitOp::RawPrismaCreate => (WitEffect::Create(false), Op::RawPrismaQuery),
            WitOp::RawPrismaUpdate => (WitEffect::Update(false), Op::RawPrismaQuery),
            WitOp::RawPrismaDelete => (WitEffect::Delete(true), Op::RawPrismaQuery),
            WitOp::QueryPrismaModel => (WitEffect::Read, Op::QueryPrismaModel),
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
            WitOp::Resolver => (WitEffect::Read, Op::Resolver),
            WitOp::GetType => (WitEffect::Read, Op::GetType),
            WitOp::GetSchema => (WitEffect::Read, Op::GetSchema),
        };

        Ok(Store::register_materializer(Materializer::typegraph(
            Store::get_typegraph_runtime(),
            op,
            effect,
        )))
    }

    fn register_substantial_runtime(
        data: wit::SubstantialRuntimeData,
    ) -> Result<RuntimeId, wit::Error> {
        Ok(Store::register_runtime(Runtime::Substantial(data.into())))
    }

    fn generate_substantial_operation(
        runtime: RuntimeId,
        data: wit::SubstantialOperationData,
    ) -> Result<FuncParams, wit::Error> {
        substantial_operation(runtime, data)
    }

    fn register_kv_runtime(data: KvRuntimeData) -> Result<RuntimeId, wit::Error> {
        Ok(Store::register_runtime(Runtime::Kv(data.into())))
    }

    fn kv_operation(
        base: BaseMaterializer,
        data: KvMaterializer,
    ) -> Result<MaterializerId, wit::Error> {
        let mat = Materializer::kv(base.runtime, data, base.effect);
        Ok(Store::register_materializer(mat))
    }

    fn register_grpc_runtime(data: GrpcRuntimeData) -> Result<RuntimeId, wit::Error> {
        let fs_ctx = FsContext::new(current_typegraph_dir()?);
        let proto_file = fs_ctx.read_text_file(Path::new(&data.proto_file))?;
        let data = GrpcRuntimeData { proto_file, ..data };

        Ok(Store::register_runtime(Runtime::Grpc(data.into())))
    }

    fn call_grpc_method(runtime: RuntimeId, data: GrpcData) -> Result<FuncParams, wit::Error> {
        call_grpc_method(runtime, data)
    }
}
