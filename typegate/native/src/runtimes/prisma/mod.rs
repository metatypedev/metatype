#![allow(clippy::not_unsafe_ptr_arg_deref)]

// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use deno_bindgen::deno_bindgen;
mod engine;
mod engine_import;
mod introspection;
use introspection::Introspection;
mod migration;
use crate::RT;
use dashmap::DashMap;
use lazy_static::lazy_static;
mod utils;

lazy_static! {
    static ref ENGINES: DashMap<String, engine_import::QueryEngine> = DashMap::new();
}

// introspection

#[deno_bindgen]
struct PrismaIntrospectionInp {
    datamodel: String,
}

#[deno_bindgen]
enum PrismaIntrospectionOut {
    Ok { introspection: String },
    Err { message: String },
}

#[deno_bindgen(non_blocking)]
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

#[deno_bindgen]
struct PrismaRegisterEngineInp {
    datamodel: String,
    typegraph: String,
}

#[deno_bindgen]
enum PrismaRegisterEngineOut {
    Ok { engine_id: String },
    Err { message: String },
}

#[deno_bindgen(non_blocking)]
fn prisma_register_engine(input: PrismaRegisterEngineInp) -> PrismaRegisterEngineOut {
    match RT.block_on(engine::register_engine(input.datamodel, input.typegraph)) {
        Ok(engine_id) => PrismaRegisterEngineOut::Ok { engine_id },
        Err(e) => PrismaRegisterEngineOut::Err {
            message: e.to_string(),
        },
    }
}

// unregister engine

#[deno_bindgen]
struct PrismaUnregisterEngineInp {
    key: String,
}

#[deno_bindgen]
enum PrismaUnregisterEngineOut {
    Ok { key: String },
    Err { message: String },
}

#[deno_bindgen(non_blocking)]
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

#[deno_bindgen]
struct PrismaQueryInp {
    key: String,
    query: serde_json::Value,
    datamodel: String,
}

#[deno_bindgen]
enum PrismaQueryOut {
    Ok { res: String },
    Err { message: String },
}

#[deno_bindgen(non_blocking)]
fn prisma_query(input: PrismaQueryInp) -> PrismaQueryOut {
    let fut = RT.block_on(engine::query(input.key, input.query));
    match fut {
        Ok(res) => PrismaQueryOut::Ok { res },
        Err(err) => PrismaQueryOut::Err {
            message: err.to_string(),
        },
    }
}

#[deno_bindgen]
struct PrismaDiffInp {
    datasource: String,
    datamodel: String,
    script: bool,
}

#[deno_bindgen]
enum PrismaDiffOut {
    Ok { diff: Option<String> },
    Err { message: String },
}

#[deno_bindgen(non_blocking)]
fn prisma_diff(input: PrismaDiffInp) -> PrismaDiffOut {
    let res = migration::diff(input.datasource, input.datamodel, input.script);
    match RT.block_on(res) {
        Ok(diff) => PrismaDiffOut::Ok { diff },
        Err(e) => PrismaDiffOut::Err {
            message: e.to_string(),
        },
    }
}

#[deno_bindgen]
struct PrismaApplyInp {
    datasource: String,
    datamodel: String,
    migrations: Option<String>,
    reset_database: bool,
}

#[deno_bindgen]
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

#[deno_bindgen(non_blocking)]
fn prisma_apply(input: PrismaApplyInp) -> PrismaApplyOut {
    match RT.block_on(migration::apply(input)) {
        Ok(res) => res,
        Err(e) => PrismaApplyOut::Err {
            message: e.to_string(),
        },
    }
}

#[deno_bindgen]
struct PrismaDeployInp {
    datasource: String,
    datamodel: String,
    migrations: String,
}

#[deno_bindgen]
enum PrismaDeployOut {
    Ok {
        migration_count: usize,
        applied_migrations: Vec<String>,
    },
    Err {
        message: String,
    },
}

#[deno_bindgen(non_blocking)]
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

#[deno_bindgen]
pub struct PrismaCreateInp {
    datasource: String,
    datamodel: String,
    migrations: Option<String>,
    migration_name: String,
    apply: bool,
}

#[deno_bindgen]
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

#[deno_bindgen(non_blocking)]
fn prisma_create(input: PrismaCreateInp) -> PrismaCreateOut {
    match RT.block_on(migration::create(input)) {
        Ok(res) => res,
        Err(e) => PrismaCreateOut::Err {
            message: e.to_string(),
        },
    }
}

#[deno_bindgen]
struct UnpackInp {
    dest: String,
    migrations: String,
}

#[deno_bindgen]
enum UnpackResult {
    Ok,
    Err { message: String },
}

#[deno_bindgen(non_blocking)]
fn unpack(input: UnpackInp) -> UnpackResult {
    match common::migrations::unpack(&input.dest, Some(input.migrations)) {
        Ok(_) => UnpackResult::Ok,
        Err(e) => UnpackResult::Err {
            message: e.to_string(),
        },
    }
}

#[deno_bindgen]
struct ArchiveInp {
    path: String,
}

#[deno_bindgen]
enum ArchiveResult {
    Ok { base64: String },
    Err { message: String },
}

#[deno_bindgen(non_blocking)]
fn archive(input: ArchiveInp) -> ArchiveResult {
    match common::migrations::archive(input.path) {
        Ok(b) => ArchiveResult::Ok { base64: b },
        Err(e) => ArchiveResult::Err {
            message: e.to_string(),
        },
    }
}
