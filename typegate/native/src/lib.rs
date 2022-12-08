#![allow(clippy::not_unsafe_ptr_arg_deref)]

// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use deno_bindgen::deno_bindgen;
use prisma::introspection::Introspection;
mod conf;
mod prisma;
mod s3;
mod typegraph;
use crate::prisma::engine;
use crate::prisma::migration;
use conf::CONFIG;
use dashmap::DashMap;
use lazy_static::lazy_static;
use log::info;
use static_init::dynamic;
use std::{borrow::Cow, collections::BTreeMap, panic, path::PathBuf, str::FromStr};
use tokio::runtime::Runtime;

#[cfg(test)]
mod tests;

lazy_static! {
    static ref RT: Runtime = {
        info!("Runtime created");
        Runtime::new().unwrap()
    };
    static ref ENGINES: DashMap<String, engine::QueryEngine> = DashMap::new();
}

#[cfg(not(test))]
#[dynamic]
#[allow(dead_code)]
static SENTRY: sentry::ClientInitGuard = {
    sentry::init((
        CONFIG.sentry_dsn.clone(),
        sentry::ClientOptions {
            release: Some(Cow::from(common::get_version())),
            environment: Some(Cow::from(if CONFIG.debug {
                "development".to_string()
            } else {
                "production".to_string()
            })),
            sample_rate: CONFIG.sentry_sample_rate,
            traces_sample_rate: CONFIG.sentry_traces_sample_rate,
            ..Default::default()
        },
    ))
};

#[deno_bindgen]
fn init() {
    env_logger::init();
    info!("init");
    let default_panic = std::panic::take_hook();
    panic::set_hook(Box::new(move |panic_info| {
        println!("ERRROR");
        default_panic(panic_info);
    }));
}

#[deno_bindgen]
fn get_version() -> String {
    common::get_version()
}

// introspection

#[deno_bindgen]
struct PrismaIntrospectionInp {
    datamodel: String,
}

#[deno_bindgen]
struct PrismaIntrospectionOut {
    introspection: String,
}

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
fn prisma_introspection(input: PrismaIntrospectionInp) -> PrismaIntrospectionOut {
    let fut = Introspection::introspect(input.datamodel);
    let introspection = RT.block_on(fut).unwrap();
    PrismaIntrospectionOut { introspection }
}

// register engine

#[deno_bindgen]
struct PrismaRegisterEngineInp {
    datamodel: String,
    typegraph: String,
}

#[deno_bindgen]
struct PrismaRegisterEngineOut {
    engine_id: String,
}

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
fn prisma_register_engine(input: PrismaRegisterEngineInp) -> PrismaRegisterEngineOut {
    let conf = engine::ConstructorOptions {
        datamodel: input.datamodel,
        log_level: "info".to_string(),
        log_queries: true,
        datasource_overrides: BTreeMap::default(),
        env: serde_json::json!({}),
        config_dir: PathBuf::from_str(".").unwrap(),

        ignore_env_var_errors: false,
    };
    let engine = engine::QueryEngine::new(conf).expect("cannot connect");
    RT.block_on(engine.connect()).unwrap();
    let engine_id = format!("{}_{}", input.typegraph, ENGINES.len() + 1);
    ENGINES.insert(engine_id.clone(), engine);
    PrismaRegisterEngineOut { engine_id }
}

// unregister engine

#[deno_bindgen]
struct PrismaUnregisterEngineInp {
    key: String,
}

#[deno_bindgen]
struct PrismaUnregisterEngineOut {
    key: String,
}

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
fn prisma_unregister_engine(input: PrismaUnregisterEngineInp) -> PrismaUnregisterEngineOut {
    let (key, engine) = ENGINES.remove(&input.key).unwrap();
    RT.block_on(engine.disconnect()).unwrap();
    PrismaUnregisterEngineOut { key }
}

// query

#[deno_bindgen]
struct PrismaQueryInp {
    key: String,
    query: serde_json::Value,
    datamodel: String,
}

#[deno_bindgen]
struct PrismaQueryOut {
    res: String,
}

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
fn prisma_query(input: PrismaQueryInp) -> PrismaQueryOut {
    let body: request_handlers::GraphQlBody = serde_json::from_value(input.query).unwrap();
    let engine = ENGINES.get(&input.key).unwrap();
    let fut = engine.query(body, None);
    let results = RT.block_on(fut);
    let res = serde_json::to_string(&results.unwrap()).unwrap();
    PrismaQueryOut { res }
}

#[deno_bindgen]
struct PrismaDiffInp {
    datasource: String,
    datamodel: String,
    script: bool,
}

#[deno_bindgen]
struct PrismaDiffOut {
    diff: Option<String>,
}

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
fn prisma_diff(input: PrismaDiffInp) -> PrismaDiffOut {
    let fut = migration::diff(input.datasource, input.datamodel, input.script);
    let res = RT.block_on(fut);
    if let Ok(diff) = res {
        PrismaDiffOut { diff }
    } else {
        PrismaDiffOut { diff: None }
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

// TODO use `.expect()` instead of `.unwrap()`

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
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

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
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
struct PrismaCreateInp {
    datasource: String,
    datamodel: String,
    migrations: Option<String>,
    migration_name: String,
    apply: bool,
}

#[deno_bindgen]
enum PrismaCreateOut {
    Ok {
        created_migration_name: String,
        applied_migrations: Vec<String>,
        migrations: String,
    },
    Err {
        message: String,
    },
}

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
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
    match common::migrations::archive(&input.path) {
        Ok(b) => ArchiveResult::Ok { base64: b },
        Err(e) => ArchiveResult::Err {
            message: e.to_string(),
        },
    }
}
