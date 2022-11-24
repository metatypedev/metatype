#![allow(clippy::not_unsafe_ptr_arg_deref)]

// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use convert_case::{Case, Casing};
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
use flate2::read::GzDecoder;
use lazy_static::lazy_static;
use log::info;
use static_init::dynamic;
use std::io::Read;
use std::path::Path;
use std::{borrow::Cow, collections::BTreeMap, panic, path::PathBuf, str::FromStr};
use tar::Archive;
use tempfile::tempdir;
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
    migration_folder: String,
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
    },
}

// TODO use `.expect()` instead of `.unwrap()`

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
fn prisma_apply(input: PrismaApplyInp) -> PrismaApplyOut {
    let fut = async {
        use migration_core::json_rpc::types::{
            ApplyMigrationsInput, DevAction, DevDiagnosticInput,
        };
        use migration_core::migration_api;

        let api = migration_api(Some(input.datasource), None).unwrap();

        let res = api
            .dev_diagnostic(DevDiagnosticInput {
                migrations_directory_path: input.migration_folder.clone(),
            })
            .await
            .unwrap();

        let reset_reason: Option<String> = if let DevAction::Reset(reset) = res.action {
            if input.reset_database {
                api.reset(None).await.unwrap();
                Some(reset.reason)
            } else {
                return PrismaApplyOut::ResetRequired {
                    reset_reason: reset.reason,
                };
            }
        } else {
            None
        };

        let res = api
            .apply_migrations(ApplyMigrationsInput {
                migrations_directory_path: input.migration_folder.clone(),
            })
            .await
            .unwrap();

        let applied_migrations = res.applied_migration_names;

        PrismaApplyOut::MigrationsApplied {
            reset_reason,
            applied_migrations,
        }
    };

    RT.block_on(fut)
}

#[deno_bindgen]
struct PrismaDeployInp {
    datasource: String,
    datamodel: String,
    migrations: String,
}

#[deno_bindgen]
struct PrismaDeployOut {
    migration_count: usize,
    applied_migrations: Vec<String>,
}

fn unpack<R: Sized + Read, P: AsRef<Path>>(
    mut ar: Archive<R>,
    dest: P,
    prefix: &str,
) -> anyhow::Result<()> {
    for entry in ar.entries()? {
        entry.ok().and_then(|mut entry| {
            entry
                .path()
                .ok()
                .and_then(|path| path.strip_prefix(prefix).ok().map(|path| path.to_owned()))
                .and_then(|path| entry.unpack(dest.as_ref().join(path)).ok())
        });
    }
    Ok(())
}

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
fn prisma_deploy(input: PrismaDeployInp) -> PrismaDeployOut {
    let dir = tempdir().unwrap();
    let migration_folder = dir.path();
    let migrations = base64::decode(input.migrations).unwrap();
    let migrations: &[u8] = &migrations;
    let tar = GzDecoder::new(migrations);
    let archive = Archive::new(tar);
    unpack(archive, migration_folder, "migrations").unwrap();

    let migration_folder = migration_folder.to_str().unwrap();

    let fut = async {
        use migration_core::json_rpc::types::{
            ApplyMigrationsInput, ListMigrationDirectoriesInput,
        };
        use migration_core::migration_api;

        let api = migration_api(Some(input.datasource), None).unwrap();

        let res = api
            .list_migration_directories(ListMigrationDirectoriesInput {
                migrations_directory_path: migration_folder.to_owned(),
            })
            .await
            .unwrap();
        let migration_count = res.migrations.len();

        let res = api
            .apply_migrations(ApplyMigrationsInput {
                migrations_directory_path: migration_folder.to_owned(),
            })
            .await
            .unwrap();
        let applied_migrations = res.applied_migration_names;

        PrismaDeployOut {
            migration_count,
            applied_migrations,
        }
    };

    RT.block_on(fut)
}

#[deno_bindgen]
struct PrismaCreateInp {
    datasource: String,
    datamodel: String,
    migration_folder: String,
    migration_name: String,
    apply: bool,
}

#[deno_bindgen]
struct PrismaCreateOut {
    created_migration_name: String,
    applied_migrations: Vec<String>,
}

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
fn prisma_create(input: PrismaCreateInp) -> PrismaCreateOut {
    let fut = async {
        use migration_core::json_rpc::types::{ApplyMigrationsInput, CreateMigrationInput};
        use migration_core::migration_api;

        let api = migration_api(Some(input.datasource.clone()), None).unwrap();

        let res = api
            .create_migration(CreateMigrationInput {
                draft: !input.apply,
                migration_name: input.migration_name.to_case(Case::Snake),
                migrations_directory_path: input.migration_folder.clone(),
                prisma_schema: format!("{}{}", input.datasource, input.datamodel),
            })
            .await
            .unwrap();

        let created_migration_name = res.generated_migration_name.unwrap();

        let applied_migrations = if input.apply {
            let res = api
                .apply_migrations(ApplyMigrationsInput {
                    migrations_directory_path: input.migration_folder,
                })
                .await
                .unwrap();

            res.applied_migration_names
        } else {
            vec![]
        };

        PrismaCreateOut {
            created_migration_name,
            applied_migrations,
        }
    };

    RT.block_on(fut)
}
