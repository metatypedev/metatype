// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod config;
mod ext;
mod typegraph;
mod typescript;

mod interlude {
    pub use anyhow::{Context, Result};
    pub use log::{debug, error, info, trace, warn};
    pub use mt_deno::deno::{
        self,
        deno_runtime::{
            self,
            deno_core::{self, serde, serde_json, serde_v8, v8},
        },
    };
    pub use std::{borrow::Cow, path::Path, path::PathBuf, sync::Arc};
}

use config::Config;

use crate::interlude::*;

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
    let permissions = mt_deno::deno::deno_runtime::permissions::PermissionsOptions {
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
        Arc::new(|| ext::extensions(ext::Context { val: 10 })),
    )
    .await
}

#[cfg(test)]
mod tests {
    use crate::interlude::*;

    use deno::deno_config;
    use deno_runtime::permissions::PermissionsOptions;

    #[test]
    fn bindings_ts_test() -> Result<()> {
        env_logger::init();
        std::env::set_var("RUST_MIN_STACK", "8388608");
        std::panic::set_hook(Box::new(move |info| {
            error!("{info} {}:{}", std::file!(), std::line!());
            std::process::exit(1);
        }));
        let permissions = PermissionsOptions {
            ..Default::default()
        };
        mt_deno::test_sync(
            deno_config::FilesConfig {
                include: Some(vec!["bindings.ts".parse()?]),
                ..Default::default()
            },
            "deno.test.jsonc".parse()?,
            permissions,
            None,
            Arc::new(|| crate::ext::extensions(crate::ext::Context { val: 10 })),
        );
        Ok(())
    }
}
