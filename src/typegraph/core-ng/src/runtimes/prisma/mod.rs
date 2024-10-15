// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod context;
pub mod errors;
pub mod migration;
pub mod relationship;
pub mod type_generation;

mod constraints;
mod model;
mod type_utils;

use std::{cell::RefCell, fmt::Debug, rc::Rc};

use common::typegraph::{self as cm, runtimes::prisma::Cardinality as PrismaCardinality};
use indexmap::IndexMap;

use crate::{
    conversion::runtimes::MaterializerConverter,
    errors::Result,
    global_store::Store,
    t::TypeBuilder,
    typegraph::TypegraphContext,
    types::{
        core::{FuncParams, RuntimeId, TypeId as CoreTypeId},
        runtimes::Effect,
    },
};

use self::{
    context::PrismaContext,
    migration::{prisma_apply, prisma_create, prisma_deploy, prisma_diff, prisma_reset},
    relationship::Cardinality,
    type_generation::replace_variables_to_indices,
};

use super::{Materializer, PrismaLinkData, PrismaMigrationOperation, PrismaRuntimeData, Runtime};

pub fn get_prisma_context(runtime_id: RuntimeId) -> Rc<RefCell<PrismaContext>> {
    match Store::get_runtime(runtime_id).unwrap() {
        Runtime::Prisma(_, ctx) => ctx,
        _ => unreachable!(),
    }
}

#[derive(Debug)]
pub struct PrismaMaterializer {
    pub table: String,
    pub operation: String,
    pub ordered_keys: Option<Vec<String>>,
}

impl MaterializerConverter for PrismaMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: Effect,
    ) -> Result<cm::Materializer> {
        let runtime = c.register_runtime(runtime_id)?;
        let mut data = IndexMap::new();
        data.insert(
            "table".to_string(),
            serde_json::Value::String(self.table.clone()),
        );
        data.insert(
            "operation".to_string(),
            serde_json::Value::String(self.operation.clone()),
        );
        if let Some(ordered_keys) = self.ordered_keys.clone() {
            let value = serde_json::to_value(ordered_keys).map_err(|e| e.to_string())?;
            data.insert("ordered_keys".to_string(), value);
        }
        Ok(cm::Materializer {
            name: "prisma_operation".to_string(),
            runtime,
            effect: effect.into(),
            data,
        })
    }
}

impl From<Cardinality> for PrismaCardinality {
    fn from(cardinality: Cardinality) -> Self {
        match cardinality {
            Cardinality::Optional => PrismaCardinality::Optional,
            Cardinality::One => PrismaCardinality::One,
            Cardinality::Many => PrismaCardinality::Many,
        }
    }
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

pub fn register_prisma_runtime(data: PrismaRuntimeData) -> Result<RuntimeId> {
    Ok(Store::register_runtime(Runtime::Prisma(
        data.into(),
        Default::default(),
    )))
}

pub fn prisma_find_unique(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(runtime, model, FindUnique, "findUnique")
}

pub fn prisma_find_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(runtime, model, FindMany, "findMany")
}

pub fn prisma_find_first(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(runtime, model, FindFirst, "findFirst")
}

pub fn prisma_aggregate(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(runtime, model, Aggregate, "aggregate")
}

pub fn prisma_count(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(runtime, model, Count, "count")
}

pub fn prisma_group_by(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(runtime, model, GroupBy, "groupBy")
}

pub fn prisma_create_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(
        runtime,
        model,
        CreateOne,
        "createOne",
        Effect::Create(false)
    )
}

pub fn prisma_create_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(
        runtime,
        model,
        CreateMany,
        "createMany",
        Effect::Create(false)
    )
}

pub fn prisma_update_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(
        runtime,
        model,
        UpdateOne,
        "updateOne",
        Effect::Update(false)
    )
}

pub fn prisma_update_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(
        runtime,
        model,
        UpdateMany,
        "updateMany",
        Effect::Update(false)
    )
}

pub fn prisma_upsert_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(runtime, model, UpsertOne, "upsertOne", Effect::Update(true))
}

pub fn prisma_delete_one(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(runtime, model, DeleteOne, "deleteOne", Effect::Delete(true))
}

pub fn prisma_delete_many(runtime: RuntimeId, model: CoreTypeId) -> Result<FuncParams> {
    prisma_op!(
        runtime,
        model,
        DeleteMany,
        "deleteMany",
        Effect::Delete(true)
    )
}

pub fn prisma_execute(
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

pub fn prisma_query_raw(
    runtime: RuntimeId,
    query: String,
    param: Option<CoreTypeId>,
    out: CoreTypeId,
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
        out: types.output.into(),
        inp: types.input.into(),
        mat: mat_id,
    })
}

pub fn prisma_link(data: PrismaLinkData) -> Result<CoreTypeId> {
    let mut builder = relationship::prisma_link(data.target_type.into())?;
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

pub fn prisma_migration(operation: PrismaMigrationOperation) -> Result<FuncParams> {
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
