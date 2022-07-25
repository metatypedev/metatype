use deno_bindgen::deno_bindgen;
mod prisma;
use crate::prisma::engine;
use crate::prisma::introspection;
use dashmap::DashMap;
use lazy_static::lazy_static;
use log::info;
use std::collections::BTreeMap;
use std::panic;
use std::path::PathBuf;
use std::str::FromStr;
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
    let fut = introspection::Introspection::introspect(input.datamodel);
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
    let engine_id = format!("{}", input.typegraph);
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
    let (key, engine) = ENGINES.remove(&input.key.to_string()).unwrap();
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
    let engine = ENGINES.get(&input.key.to_string()).unwrap();
    let fut = engine.query(body, None);
    let results = RT.block_on(fut);
    let res = serde_json::to_string(&results.unwrap()).unwrap();
    PrismaQueryOut { res }
}
