#![allow(clippy::not_unsafe_ptr_arg_deref)]

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

pub mod engine;
pub mod engine_import;
pub mod migration;
pub mod utils;

use crate::interlude::*;

use dashmap::DashMap;
use deno_core::OpState;

use self::migration::{
    MigrationContextBuilder, ParsedDiff, PrismaApplyResult, PrismaCreateResult, PrismaDeployOut,
};

#[derive(Clone)]
pub struct Ctx {
    pub engines: Arc<DashMap<String, engine_import::QueryEngine>>,
    pub tmp_dir: Arc<Path>,
}

impl Ctx {
    pub fn new(tmp_dir: Arc<Path>) -> Self {
        Self {
            engines: Default::default(),
            tmp_dir,
        }
    }
}

fn reformat_datamodel(datamodel: &str) -> Option<String> {
    prisma_models::psl::reformat(datamodel, 4)
}

// register engine
#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct PrismaRegisterEngineInp {
    datamodel: String,
    engine_name: String,
}

#[deno_core::op2(async)]
pub async fn op_prisma_register_engine(
    state: Rc<RefCell<OpState>>,
    #[serde] input: PrismaRegisterEngineInp,
) -> Result<()> {
    let datamodel = reformat_datamodel(&input.datamodel).context("Error formatting datamodel")?;

    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    engine::register_engine(&ctx, datamodel, input.engine_name)
        .await
        .tap_err(|e| log::error!("Error registering engine: {:?}", e))
}

// unregister engine

#[deno_core::op2(async)]
pub async fn op_prisma_unregister_engine(
    state: Rc<RefCell<OpState>>,
    #[string] engine_name: String,
) -> Result<()> {
    let (_, engine) = {
        let state = state.borrow();
        let ctx = state.borrow::<Ctx>();
        ctx.engines.remove(&engine_name).with_context(|| {
            format!("Could not remove engine {:?}: entry not found.", {
                engine_name
            })
        })?
    };
    engine.disconnect().await?;
    Ok(())
}

// query

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct PrismaQueryInp {
    engine_name: String,
    query: serde_json::Value,
    #[allow(dead_code)]
    datamodel: String,
}

#[deno_core::op2(async)]
#[string]
pub async fn op_prisma_query(
    state: Rc<RefCell<OpState>>,
    #[serde] input: PrismaQueryInp,
) -> Result<String> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };
    engine::query(&ctx, input.engine_name, input.query).await
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct PrismaDiffInp {
    datasource: String,
    datamodel: String,
    script: bool,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_prisma_diff(
    state: Rc<RefCell<OpState>>,
    #[serde] input: PrismaDiffInp,
) -> Result<Option<(String, Vec<ParsedDiff>)>> {
    let datamodel = reformat_datamodel(&input.datamodel).context("Error formatting datamodel")?;
    let tmp_dir = {
        let state = state.borrow();
        state.borrow::<Ctx>().tmp_dir.clone()
    };
    let res = migration::diff(&tmp_dir, input.datasource, datamodel, input.script).await;
    eprintln!("diff result: {:?}", res);
    res
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct PrismaDevInp {
    pub datasource: String,
    pub datamodel: String,
    pub migrations: Option<String>,
    pub reset_database: bool,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_prisma_apply(
    state: Rc<RefCell<OpState>>,
    #[serde] input: PrismaDevInp,
) -> Result<PrismaApplyResult> {
    let datamodel = reformat_datamodel(&input.datamodel).context("Error formatting datamodel")?;
    let tmp_dir = {
        let state = state.borrow();
        state.borrow::<Ctx>().tmp_dir.clone()
    };
    MigrationContextBuilder::new(input.datasource, datamodel, tmp_dir)
        .with_migrations(input.migrations)
        .build()?
        .apply(input.reset_database)
        .await
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct PrismaDeployInp {
    datasource: String,
    datamodel: String,
    migrations: String,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_prisma_deploy(
    state: Rc<RefCell<OpState>>,
    #[serde] input: PrismaDeployInp,
) -> Result<PrismaDeployOut> {
    let datamodel = reformat_datamodel(&input.datamodel).context("Error formatting datamodel")?;
    let tmp_dir = {
        let state = state.borrow();
        state.borrow::<Ctx>().tmp_dir.clone()
    };
    MigrationContextBuilder::new(input.datasource, datamodel, tmp_dir)
        .with_migrations(Some(input.migrations))
        .build()?
        .deploy()
        .await
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct PrismaCreateInp {
    datasource: String,
    datamodel: String,
    migrations: Option<String>,
    migration_name: String,
    apply: bool,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_prisma_create(
    state: Rc<RefCell<OpState>>,
    #[serde] input: PrismaCreateInp,
) -> Result<PrismaCreateResult> {
    let datamodel = reformat_datamodel(&input.datamodel).context("Error formatting datamodel")?;
    let tmp_dir = {
        let state = state.borrow();
        state.borrow::<Ctx>().tmp_dir.clone()
    };
    MigrationContextBuilder::new(input.datasource, datamodel, tmp_dir)
        .with_migrations(input.migrations)
        .build()?
        .create(input.migration_name, input.apply)
        .await
}

#[deno_core::op2(async)]
pub async fn op_prisma_reset(
    state: Rc<RefCell<OpState>>,
    #[string] datasource: String,
) -> Result<bool> {
    let tmp_dir = {
        let state = state.borrow();
        state.borrow::<Ctx>().tmp_dir.clone()
    };
    MigrationContextBuilder::new(datasource, "".to_string(), tmp_dir)
        .build()?
        .reset()
        .await
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct UnpackInp {
    dest: String,
    migrations: String,
}

#[deno_core::op2]
pub fn op_unpack(#[serde] input: UnpackInp) -> Result<()> {
    common::archive::unpack(&input.dest, Some(input.migrations))
}

#[deno_core::op2]
#[string]
pub fn op_archive(#[string] path: &str) -> Result<Option<String>> {
    common::archive::archive(path)
}
