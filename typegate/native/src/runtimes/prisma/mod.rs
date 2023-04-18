#![allow(clippy::not_unsafe_ptr_arg_deref)]

// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

mod engine;
mod engine_import;
mod introspection;
use introspection::Introspection;
use once_cell::sync::Lazy;
mod migration;
use crate::RT;
use dashmap::DashMap;
mod utils;
use macros::deno;

use self::migration::{
    MigrationContextBuilder, PrismaApplyResult, PrismaCreateResult, PrismaDeployOut,
    PrismaResetResult,
};

static ENGINES: Lazy<DashMap<String, engine_import::QueryEngine>> = Lazy::new(DashMap::new);

// introspection

#[deno]
struct PrismaIntrospectionInp {
    datamodel: String,
}

#[deno]
enum PrismaIntrospectionOut {
    Ok { introspection: String },
    Err { message: String },
}

#[deno]
fn prisma_introspection(input: PrismaIntrospectionInp) -> PrismaIntrospectionOut {
    let fut = Introspection::introspect(input.datamodel);
    match RT.block_on(fut) {
        Ok(res) => PrismaIntrospectionOut::Ok { introspection: res },
        Err(e) => PrismaIntrospectionOut::Err {
            message: e.to_string(),
        },
    }
}

// register engine

#[deno]
struct PrismaRegisterEngineInp {
    datamodel: String,
    engine_name: String,
}

#[deno]
enum PrismaRegisterEngineOut {
    Ok,
    Err { message: String },
}

#[deno]
fn prisma_register_engine(input: PrismaRegisterEngineInp) -> PrismaRegisterEngineOut {
    match RT.block_on(engine::register_engine(input.datamodel, input.engine_name)) {
        Ok(()) => PrismaRegisterEngineOut::Ok,
        Err(e) => PrismaRegisterEngineOut::Err {
            message: e.to_string(),
        },
    }
}

// unregister engine

#[deno]
struct PrismaUnregisterEngineInp {
    engine_name: String,
}

#[deno]
enum PrismaUnregisterEngineOut {
    Ok,
    Err { message: String },
}

#[deno]
fn prisma_unregister_engine(input: PrismaUnregisterEngineInp) -> PrismaUnregisterEngineOut {
    let Some((_, engine)) = ENGINES.remove(&input.engine_name) else {
        return PrismaUnregisterEngineOut::Err { message: format!("Could not remove engine {:?}: entry not found.", {input.engine_name})};
    };
    match RT.block_on(engine.disconnect()) {
        Ok(()) => PrismaUnregisterEngineOut::Ok,
        Err(e) => PrismaUnregisterEngineOut::Err {
            message: format!("{:?}", e),
        },
    }
}

// query

#[deno]
struct PrismaQueryInp {
    engine_name: String,
    query: serde_json::Value,
    datamodel: String,
}

#[deno]
enum PrismaQueryOut {
    Ok { res: String },
    Err { message: String },
}

#[deno]
fn prisma_query(input: PrismaQueryInp) -> PrismaQueryOut {
    let fut = RT.block_on(engine::query(input.engine_name, input.query));
    match fut {
        Ok(res) => PrismaQueryOut::Ok { res },
        Err(err) => PrismaQueryOut::Err {
            message: err.to_string(),
        },
    }
}

#[deno]
struct PrismaDiffInp {
    datasource: String,
    datamodel: String,
    script: bool,
}

#[deno]
enum PrismaDiffOut {
    Ok { diff: Option<String> },
    Err { message: String },
}

#[deno]
fn prisma_diff(input: PrismaDiffInp) -> PrismaDiffOut {
    let res = migration::diff(input.datasource, input.datamodel, input.script);
    match RT.block_on(res) {
        Ok(diff) => PrismaDiffOut::Ok { diff },
        Err(e) => PrismaDiffOut::Err {
            message: e.to_string(),
        },
    }
}

#[deno]
struct PrismaDevInp {
    pub datasource: String,
    pub datamodel: String,
    pub migrations: Option<String>,
    pub reset_database: bool,
}

#[deno]
fn prisma_apply(input: PrismaDevInp) -> PrismaApplyResult {
    RT.block_on(migration::apply(
        MigrationContextBuilder::new(input.datasource, input.datamodel)
            .with_migrations(input.migrations),
        input.reset_database,
    ))
}

#[deno]
struct PrismaDeployInp {
    datasource: String,
    datamodel: String,
    migrations: String,
}

#[deno]
fn prisma_deploy(input: PrismaDeployInp) -> PrismaDeployOut {
    RT.block_on(migration::deploy(
        MigrationContextBuilder::new(input.datasource, input.datamodel)
            .with_migrations(Some(input.migrations)),
    ))
}

#[deno]
pub struct PrismaCreateInp {
    datasource: String,
    datamodel: String,
    migrations: Option<String>,
    migration_name: String,
    apply: bool,
}

#[deno]
fn prisma_create(input: PrismaCreateInp) -> PrismaCreateResult {
    RT.block_on(migration::create(
        MigrationContextBuilder::new(input.datasource, input.datamodel)
            .with_migrations(input.migrations),
        input.migration_name,
        input.apply,
    ))
}

#[deno]
pub struct PrismaResetInp {
    datasource: String,
}

#[deno]
fn prisma_reset(input: PrismaResetInp) -> PrismaResetResult {
    RT.block_on(migration::reset(MigrationContextBuilder::new(
        input.datasource,
        "".to_string(),
    )))
}

#[deno]
struct UnpackInp {
    dest: String,
    migrations: String,
}

#[deno]
enum UnpackResult {
    Ok,
    Err { message: String },
}

#[deno]
fn unpack(input: UnpackInp) -> UnpackResult {
    match common::archive::unpack(&input.dest, Some(input.migrations)) {
        Ok(_) => UnpackResult::Ok,
        Err(e) => UnpackResult::Err {
            message: e.to_string(),
        },
    }
}

#[deno]
struct ArchiveInp {
    path: String,
}

#[deno]
enum ArchiveResult {
    Ok { base64: Option<String> },
    Err { message: String },
}

#[deno]
fn archive(input: ArchiveInp) -> ArchiveResult {
    match common::archive::archive(input.path) {
        Ok(b) => ArchiveResult::Ok { base64: b },
        Err(e) => ArchiveResult::Err {
            message: e.to_string(),
        },
    }
}
