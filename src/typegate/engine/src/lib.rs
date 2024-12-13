// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod ext;
mod py_validation;
mod runtimes;
// mod snapshot;
mod typegraph;

#[allow(unused_imports)]
mod interlude {
    pub use anyhow::{Context, Result};
    pub use mt_deno::deno::{
        self,
        deno_runtime::{
            self,
            deno_core::{
                self,
                serde::{self, Deserialize, Serialize},
                serde_json, serde_v8, url, v8,
            },
        },
    };
    pub use std::{borrow::Cow, cell::RefCell, path::Path, path::PathBuf, rc::Rc, sync::Arc};
    pub use tap::prelude::*;
    pub use tracing::{debug, error, info, trace, warn};
}

pub use deno_core::{resolve_url, resolve_url_or_path};
pub use ext::extensions;
pub use mt_deno::new_thread_builder;
#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work
use shadow_rs::shadow;

shadow!(build);

use crate::interlude::*;

// This is used to populate the deno_core::OpState with dependencies
// used by the different ops
#[derive(Clone)]
pub struct OpDepInjector {
    tmp_dir: Option<Arc<Path>>,
    snapshot_seed: bool,
}

impl OpDepInjector {
    pub fn from_env() -> Self {
        use std::str::FromStr;
        Self {
            tmp_dir: Some(
                std::env::var("TMP_DIR")
                    .map(|p| PathBuf::from_str(&p).expect("invalid TMP_DIR"))
                    .unwrap_or_else(|_| {
                        std::env::current_dir().expect("no current dir").join("tmp")
                    })
                    .into(),
            ),
            snapshot_seed: false,
        }
    }

    pub fn for_snapshot() -> Self {
        Self {
            tmp_dir: None,
            snapshot_seed: true,
        }
    }

    pub fn inject(self, state: &mut deno_core::OpState) {
        if self.snapshot_seed {
            return;
        };
        #[cfg(test)]
        state.put(ext::tests::TestCtx { val: 10 });
        state.put(runtimes::temporal::Ctx::default());
        let engine = wasmtime::Engine::new(
            wasmtime::Config::new()
                .async_support(true)
                .wasm_backtrace(true)
                // embedded wasm images have backtrace enabled
                .wasm_backtrace_details(wasmtime::WasmBacktraceDetails::Enable)
                .cache_config_load_default()
                .context("error reading system's wasmtime cache config")
                .unwrap(),
        )
        .expect("invalid wasmtime engine config");
        let tmp_dir = self.tmp_dir.unwrap();
        state.put(
            runtimes::wit_wire::Ctx::new(engine, tmp_dir.join("wit_wire_workdir"))
                .expect("error initializing wit_wire state"),
        );
        state.put(runtimes::prisma::Ctx::new(tmp_dir));
        state.put(runtimes::grpc::Ctx::default());
        state.put(runtimes::substantial::Ctx::default());
    }
}

/// The runtime is single threaded and configured using environment vars from deno  
pub fn runtime() -> tokio::runtime::Runtime {
    let (event_interval, global_queue_interval, max_io_events_per_tick) = (61, 31, 1024);

    tokio::runtime::Builder::new_current_thread()
        .enable_io()
        .enable_time()
        .event_interval(
            std::env::var("DENO_TOKIO_EVENT_INTERVAL")
                .map_err(|_| ())
                .and_then(|str| str.parse().map_err(|_| ()))
                .unwrap_or(event_interval),
        )
        .global_queue_interval(
            std::env::var("DENO_TOKIO_GLOBAL_QUEUE_INTERVAL")
                .map_err(|_| ())
                .and_then(|str| str.parse().map_err(|_| ()))
                .unwrap_or(global_queue_interval),
        )
        .max_io_events_per_tick(
            std::env::var("DENO_TOKIO_MAX_IO_EVENTS_PER_TICK")
                .map_err(|_| ())
                .and_then(|str| str.parse().map_err(|_| ()))
                .unwrap_or(max_io_events_per_tick),
        )
        // This limits the number of threads for blocking operations (like for
        // synchronous fs ops) or CPU bound tasks like when we run dprint in
        // parallel for deno fmt.
        // The default value is 512, which is an unhelpfully large thread pool. We
        // don't ever want to have more than a couple dozen threads.
        .max_blocking_threads(32)
        .build()
        .unwrap()
}

/// Either run this on a single threaded executor or `spawn_local`
/// it on a [`LocalSet`](tokio::task::LocalSet)
pub async fn launch_typegate_deno(
    main_mod: deno_core::ModuleSpecifier,
    import_map_url: Option<String>,
) -> Result<()> {
    if std::env::var("TMP_DIR").is_err() {
        std::env::set_var(
            "TMP_DIR",
            std::env::var("MT_DIR")
                .map(|p| PathBuf::from_str(&p).expect("invalid $MT_DIR"))
                .unwrap_or_else(|_| {
                    std::env::current_dir()
                        .expect("no cwd found")
                        .join(".metatype")
                }),
        );
    }

    use std::str::FromStr;
    let tmp_dir = std::env::var("TMP_DIR")
        .map(|p| PathBuf::from_str(&p).expect("invalid $TMP_DIR"))
        .unwrap();
    tokio::fs::create_dir_all(&tmp_dir).await?;
    let gitignore = tmp_dir.join(".gitignore");
    if matches!(tokio::fs::try_exists(&gitignore).await, Err(_) | Ok(false)) {
        tokio::fs::write(gitignore, "*").await?;
    }

    let permissions = deno_runtime::deno_permissions::PermissionsOptions {
        allow_run: Some(["hostname"].into_iter().map(str::to_owned).collect()),
        allow_sys: Some(vec![]),
        allow_env: Some(vec![]),
        allow_hrtime: true,
        allow_write: Some(vec![tmp_dir.clone()]),
        allow_ffi: Some(vec![]),
        allow_read: Some(
            // we allow read for the whole fs
            // since the location of `main_mod`
            // is user configurable and we need read
            // access to typescript files to execute them
            vec![],
        ),
        allow_net: Some(vec![]),
        ..Default::default()
    };

    mt_deno::run(
        main_mod,
        import_map_url,
        permissions,
        Arc::new(|| ext::extensions(OpDepInjector::from_env())),
    )
    .await
}

#[deno_core::op2]
#[string]
fn op_get_version() -> &'static str {
    build::PKG_VERSION
}

#[cfg(test)]
mod tests {
    use crate::interlude::*;

    use deno_runtime::deno_permissions::PermissionsOptions;

    #[test]
    #[ignore]
    fn run_typegate() -> Result<()> {
        env_logger::init();
        std::env::set_var("RUST_MIN_STACK", "8388608");
        std::panic::set_hook(Box::new(move |info| {
            error!("{info} {}:{}", std::file!(), std::line!());
            std::process::exit(1);
        }));
        let permissions = PermissionsOptions {
            allow_run: Some(["hostname"].into_iter().map(str::to_owned).collect()),
            allow_sys: Some(vec![]),
            allow_env: Some(vec![]),
            allow_hrtime: true,
            allow_write: Some(
                ["tmp"]
                    .into_iter()
                    .map(std::str::FromStr::from_str)
                    .collect::<Result<_, _>>()?,
            ),
            allow_ffi: Some(vec![]),
            // allow_read: Some(vec![]),
            allow_net: Some(vec![]),
            ..Default::default()
        };
        mt_deno::run_sync(
            super::resolve_url_or_path("", &std::env::current_dir()?.join("../src/main.ts"))?,
            Some(
                std::env::current_dir()?
                    .join("../deno.jsonc")
                    .to_string_lossy()
                    .into(),
            ),
            permissions,
            Arc::new(|| crate::ext::extensions(crate::OpDepInjector::from_env())),
        );
        Ok(())
    }
}
