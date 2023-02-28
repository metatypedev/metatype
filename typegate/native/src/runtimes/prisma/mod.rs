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
    typegraph: String,
}

#[deno]
enum PrismaRegisterEngineOut {
    Ok { engine_id: String },
    Err { message: String },
}

#[deno]
fn prisma_register_engine(input: PrismaRegisterEngineInp) -> PrismaRegisterEngineOut {
    match RT.block_on(engine::register_engine(input.datamodel, input.typegraph)) {
        Ok(engine_id) => PrismaRegisterEngineOut::Ok { engine_id },
        Err(e) => PrismaRegisterEngineOut::Err {
            message: e.to_string(),
        },
    }
}

// unregister engine

#[deno]
struct PrismaUnregisterEngineInp {
    key: String,
}

#[deno]
enum PrismaUnregisterEngineOut {
    Ok { key: String },
    Err { message: String },
}

#[deno]
fn prisma_unregister_engine(input: PrismaUnregisterEngineInp) -> PrismaUnregisterEngineOut {
    let Some((key, engine)) = ENGINES.remove(&input.key) else {
        return PrismaUnregisterEngineOut::Err { message: format!("Could not remove engine {:?}: entry not found.", {input.key})};
    };
    match RT.block_on(engine.disconnect()) {
        Ok(_) => PrismaUnregisterEngineOut::Ok { key },
        Err(e) => PrismaUnregisterEngineOut::Err {
            message: format!("{:?}", e),
        },
    }
}

// query

#[deno]
struct PrismaQueryInp {
    key: String,
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
    let fut = RT.block_on(engine::query(input.key, input.query));
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
struct PrismaApplyInp {
    datasource: String,
    datamodel: String,
    migrations: Option<String>,
    reset_database: bool,
}

#[deno]
enum PrismaApplyOut {
    ResetRequired {
        reset_reason: String,
    },
    MigrationsApplied {
        reset_reason: Option<String>,
        applied_migrations: Vec<String>,
        migrations: String,
    },
    Err {
        message: String,
    },
}

#[deno]
fn prisma_apply(input: PrismaApplyInp) -> PrismaApplyOut {
    match RT.block_on(migration::apply(input)) {
        Ok(res) => res,
        Err(e) => PrismaApplyOut::Err {
            message: e.to_string(),
        },
    }
}

#[deno]
struct PrismaDeployInp {
    datasource: String,
    datamodel: String,
    migrations: String,
}

#[deno]
enum PrismaDeployOut {
    Ok {
        migration_count: usize,
        applied_migrations: Vec<String>,
    },
    Err {
        message: String,
    },
}

#[deno]
fn prisma_deploy(input: PrismaDeployInp) -> PrismaDeployOut {
    let ret = RT.block_on(migration::deploy(
        input.datasource,
        input.datamodel,
        input.migrations,
    ));

    match ret {
        Ok((migration_count, applied_migrations)) => PrismaDeployOut::Ok {
            migration_count,
            applied_migrations,
        },
        Err(e) => PrismaDeployOut::Err {
            message: e.to_string(),
        },
    }
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
pub enum PrismaCreateOut {
    Ok {
        created_migration_name: String,
        applied_migrations: Vec<String>,
        migrations: String,
    },
    Err {
        message: String,
    },
}

#[deno]
fn prisma_create(input: PrismaCreateInp) -> PrismaCreateOut {
    match RT.block_on(migration::create(input)) {
        Ok(res) => res,
        Err(e) => PrismaCreateOut::Err {
            message: e.to_string(),
        },
    }
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
    Ok { base64: String },
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
