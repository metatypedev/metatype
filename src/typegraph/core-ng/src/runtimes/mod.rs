// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod aws;
pub mod deno;
pub mod graphql;
pub mod grpc;
pub mod http;
pub mod kv;
pub mod prisma;
pub mod python;
pub mod random;
pub mod substantial;
pub mod temporal;
pub mod typegate;
pub mod typegraph;
pub mod wasm;

pub use self::{
    deno::{DenoMaterializer, MaterializerDenoImport, MaterializerDenoModule},
    graphql::GraphqlMaterializer,
    python::PythonMaterializer,
    random::RandomMaterializer,
    temporal::TemporalMaterializer,
    wasm::WasmMaterializer,
};

use std::{cell::RefCell, rc::Rc};

use enum_dispatch::enum_dispatch;
use substantial::SubstantialMaterializer;

use crate::{errors::Result, global_store::Store};

use crate::types::{
    aws::S3RuntimeData,
    core::{MaterializerId, RuntimeId},
    runtimes::{self as rt, *},
};

use self::{
    aws::S3Materializer,
    grpc::GrpcMaterializer,
    prisma::{context::PrismaContext, PrismaMaterializer},
    typegate::TypegateOperation,
};

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

pub fn register_typegate_materializer(operation: rt::TypegateOperation) -> Result<MaterializerId> {
    use rt::TypegateOperation as RawOp;
    use TypegateOperation as Op;

    let (effect, op) = match operation {
        RawOp::ListTypegraphs => (Effect::Read, Op::ListTypegraphs),
        RawOp::FindTypegraph => (Effect::Read, Op::FindTypegraph),
        RawOp::AddTypegraph => (Effect::Create(true), Op::AddTypegraph),
        RawOp::RemoveTypegraphs => (Effect::Delete(true), Op::RemoveTypegraphs),
        RawOp::GetSerializedTypegraph => (Effect::Read, Op::GetSerializedTypegraph),
        RawOp::GetArgInfoByPath => (Effect::Read, Op::GetArgInfoByPath),
        RawOp::FindAvailableOperations => (Effect::Read, Op::FindAvailableOperations),
        RawOp::FindPrismaModels => (Effect::Read, Op::FindPrismaModels),
        RawOp::RawPrismaRead => (Effect::Read, Op::RawPrismaQuery),
        RawOp::RawPrismaCreate => (Effect::Create(false), Op::RawPrismaQuery),
        RawOp::RawPrismaUpdate => (Effect::Update(false), Op::RawPrismaQuery),
        RawOp::RawPrismaDelete => (Effect::Delete(true), Op::RawPrismaQuery),
        RawOp::QueryPrismaModel => (Effect::Read, Op::QueryPrismaModel),
    };

    Ok(Store::register_materializer(Materializer::typegate(
        Store::get_typegate_runtime(),
        op,
        effect,
    )))
}

pub fn register_typegraph_materializer(operation: TypegraphOperation) -> Result<MaterializerId> {
    Ok(Store::register_materializer(Materializer::typegraph(
        Store::get_typegraph_runtime(),
        operation,
        Effect::Read,
    )))
}
