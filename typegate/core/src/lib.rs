// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod config;
mod ext;
mod runtimes;
mod typegraph;
mod typescript;

mod interlude {
    pub use anyhow::{Context, Result};
    pub use log::{debug, error, info, trace, warn};
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
}

pub use config::Config;
pub use ext::extensions;
#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work

use crate::interlude::*;

// This is uded to populate the deno_core::OpState with dependencies
// used by the different ops
#[derive(Clone)]
pub struct OpDepInjector {
    tmp_dir: Arc<Path>,
}

impl OpDepInjector {
    pub fn from_env() -> Self {
        use std::str::FromStr;
        Self {
            tmp_dir: std::env::var("TMP_DIR")
                .map(|p| PathBuf::from_str(&p).expect("invalid TMP_DIR"))
                .unwrap_or_else(|_| std::env::current_dir().expect("no current dir").join("tmp"))
                .into(),
        }
    }

    pub fn inject(self, state: &mut deno_core::OpState) {
        #[cfg(test)]
        state.put(ext::tests::TestCtx { val: 10 });
        state.put(runtimes::temporal::Ctx::default());
        state.put(runtimes::python::python_bindings::Ctx::default());
        state.put(runtimes::prisma::Ctx::new(self.tmp_dir));
    }
}

pub fn start(mut config: Config) -> Result<()> {
    let tg_source_dir = config
        .tg_source_dir
        .take()
        .context("tg_source_dir is None")?;
    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?;
    let _sentry_guard = init_sentry(&config);
    rt.block_on(async {
        // we use a LocalSet to run the deno runtime (it's single threaded)
        let local = tokio::task::LocalSet::new();
        local.spawn_local(async move {
            launch_typegate_deno(tg_source_dir.join("src/main.ts"))
                .await
                .context("error from typegate_deno")
                .unwrap()
        });

        // drive the local set
        local.await;
        Ok(())
    })
}

pub fn init_sentry(config: &Config) -> sentry::ClientInitGuard {
    let env = if config.debug {
        "development".to_string()
    } else {
        "production".to_string()
    };
    sentry::init((
        config.sentry_dsn.clone(),
        sentry::ClientOptions {
            release: Some(Cow::from(common::get_version())),
            environment: Some(Cow::from(env)),
            sample_rate: config.sentry_sample_rate,
            traces_sample_rate: config.sentry_traces_sample_rate,
            ..Default::default()
        },
    ))
}

async fn launch_typegate_deno(main_mod: PathBuf) -> Result<()> {
    let permissions = deno_runtime::permissions::PermissionsOptions {
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
        allow_read: Some(
            ["."]
                .into_iter()
                .map(std::str::FromStr::from_str)
                .collect::<Result<_, _>>()?,
        ),
        allow_net: Some(vec![]),
        ..Default::default()
    };
    mt_deno::run(
        &main_mod,
        permissions,
        Arc::new(|| ext::extensions(OpDepInjector::from_env())),
    )
    .await
}

#[deno_core::op2]
#[string]
fn op_get_version() -> &'static str {
    common::get_version()
}

#[cfg(test)]
mod tests {
    use crate::interlude::*;

    use deno_runtime::permissions::PermissionsOptions;

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
            allow_read: Some(vec![]),
            allow_net: Some(vec![]),
            ..Default::default()
        };
        mt_deno::run_sync(
            std::env::current_dir()?.join("../src/main.ts"),
            permissions,
            Arc::new(|| crate::ext::extensions(crate::OpDepInjector::from_env())),
        );
        Ok(())
    }
}
