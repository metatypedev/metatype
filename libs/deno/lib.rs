#![allow(dead_code, clippy::let_and_return)]

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

pub use deno;

use deno::{
    deno_runtime::{
        deno_core::{futures::FutureExt, unsync::JoinHandle},
        permissions::PermissionsOptions,
        tokio_util::create_and_run_current_thread_with_maybe_metrics,
    },
    *,
};

use std::{future::Future, sync::Arc};

#[allow(unused_imports)]
pub(crate) use log::{debug, error, info, trace, warn};

#[rustfmt::skip] 
use deno_runtime::deno_core as deno_core; // necessary for re-exported macros to work

use std::path::{Path, PathBuf};

/// Ensure that the subcommand runs in a task, rather than being directly executed. Since some of these
/// futures are very large, this prevents the stack from getting blown out from passing them by value up
/// the callchain (especially in debug mode when Rust doesn't have a chance to elide copies!).
#[inline(always)]
fn spawn_subcommand<F: Future<Output = ()> + 'static>(f: F) -> JoinHandle<()> {
    // the boxed_local() is important in order to get windows to not blow the stack in debug
    deno_core::unsync::spawn(f.boxed_local())
}

pub fn run_sync(
    main_mod: PathBuf,
    permissions: PermissionsOptions,
    custom_extensions: Arc<worker::CustomExtensionsCb>,
) {
    create_and_run_current_thread_with_maybe_metrics(async move {
        spawn_subcommand(async move {
            run(&main_mod, permissions, custom_extensions)
                .await
                .unwrap()
        })
        .await
        .unwrap()
    });
}

pub async fn run(
    main_mod: &Path,
    permissions: PermissionsOptions,
    custom_extensions: Arc<worker::CustomExtensionsCb>,
) -> anyhow::Result<()> {
    deno_runtime::permissions::set_prompt_callbacks(
        Box::new(util::draw_thread::DrawThread::hide),
        Box::new(util::draw_thread::DrawThread::show),
    );
    let main_module = deno_core::resolve_url_or_path("", main_mod)?;

    let flags = args::Flags {
        subcommand: args::DenoSubcommand::Run(args::RunFlags {
            script: main_module.path().to_owned(),
            watch: None,
        }),
        unstable: true,
        ..Default::default()
    };

    let cli_factory = factory::CliFactory::from_flags(flags)
        .await?
        .with_custom_ext_cb(custom_extensions);

    let worker_factory = cli_factory.create_cli_main_worker_factory().await?;
    let permissions = deno_runtime::permissions::PermissionsContainer::new(
        deno_runtime::permissions::Permissions::from_options(&permissions)?,
    );
    let mut worker = worker_factory
        .create_main_worker(main_module, permissions)
        .await?;
    info!("running worker");
    let exit_code = worker.run().await?;
    println!("exit_code: {exit_code}");
    Ok(())
}

pub fn test_sync(
    files: deno_config::FilesConfig,
    config_file: PathBuf,
    permissions: PermissionsOptions,
    coverage_dir: Option<String>,
    custom_extensions: Arc<worker::CustomExtensionsCb>,
) {
    std::thread::Builder::new()
        .spawn(|| {
            create_and_run_current_thread_with_maybe_metrics(async move {
                spawn_subcommand(async move {
                    test(
                        files,
                        config_file,
                        permissions,
                        coverage_dir,
                        custom_extensions,
                    )
                    .await
                    .unwrap()
                })
                .await
                .unwrap()
            })
        })
        .unwrap()
        .join()
        .unwrap();
}

pub async fn test(
    files: deno_config::FilesConfig,
    config_file: PathBuf,
    permissions: PermissionsOptions,
    coverage_dir: Option<String>,
    custom_extensions: Arc<worker::CustomExtensionsCb>,
) -> anyhow::Result<()> {
    use deno::tools::test::*;

    deno_runtime::permissions::set_prompt_callbacks(
        Box::new(util::draw_thread::DrawThread::hide),
        Box::new(util::draw_thread::DrawThread::show),
    );
    let flags = args::Flags {
        unstable: true,
        config_flag: deno_config::ConfigFlag::Path(config_file.to_string_lossy().into()),
        ..Default::default()
    };

    let cli_factory = factory::CliFactory::from_flags(flags)
        .await?
        .with_custom_ext_cb(custom_extensions);

    let options = cli_factory.cli_options().clone();

    let test_options = args::TestOptions {
        files,
        ..options.resolve_test_options(args::TestFlags {
            doc: false,
            trace_ops: true,
            coverage_dir,
            ..Default::default()
        })?
    };
    let file_fetcher = cli_factory.file_fetcher()?;
    let module_load_preparer = cli_factory.module_load_preparer().await?;

    // Various test files should not share the same permissions in terms of
    // `PermissionsContainer` - otherwise granting/revoking permissions in one
    // file would have impact on other files, which is undesirable.
    let permissions = deno_runtime::permissions::Permissions::from_options(&permissions)?;

    let specifiers_with_mode =
        fetch_specifiers_with_test_mode(file_fetcher, &test_options.files, &test_options.doc)
            .await?;

    if !test_options.allow_none && specifiers_with_mode.is_empty() {
        return Err(deno_core::error::generic_error("No test modules found"));
    }

    check_specifiers(
        options.as_ref(),
        file_fetcher,
        module_load_preparer,
        specifiers_with_mode.clone(),
    )
    .await?;

    if test_options.no_run {
        return Ok(());
    }

    let worker_factory = cli_factory.create_cli_main_worker_factory().await?;
    let worker_factory = Arc::new(worker_factory);

    test_specifiers(
        worker_factory,
        &permissions,
        specifiers_with_mode
            .into_iter()
            .filter_map(|(s, m)| match m {
                TestMode::Documentation => None,
                _ => Some(s),
            })
            .collect(),
        TestSpecifiersOptions {
            concurrent_jobs: test_options.concurrent_jobs,
            fail_fast: test_options.fail_fast,
            log_level: options.log_level(),
            filter: test_options.filter.is_some(),
            reporter: test_options.reporter,
            junit_path: test_options.junit_path,
            specifier: TestSpecifierOptions {
                filter: TestFilter::from_flag(&test_options.filter),
                shuffle: test_options.shuffle,
                trace_ops: test_options.trace_ops,
            },
        },
    )
    .await?;

    Ok(())
}

pub fn bench_sync(
    files: deno_config::FilesConfig,
    config_file: PathBuf,
    permissions: PermissionsOptions,
    custom_extensions: Arc<worker::CustomExtensionsCb>,
) {
    std::thread::Builder::new()
        .spawn(|| {
            create_and_run_current_thread_with_maybe_metrics(async move {
                spawn_subcommand(async move {
                    bench(files, config_file, permissions, custom_extensions)
                        .await
                        .unwrap()
                })
                .await
                .unwrap()
            })
        })
        .unwrap()
        .join()
        .unwrap();
}

pub async fn bench(
    files: deno_config::FilesConfig,
    config_file: PathBuf,
    permissions: PermissionsOptions,
    custom_extensions: Arc<worker::CustomExtensionsCb>,
) -> anyhow::Result<()> {
    use deno::tools::bench::*;
    use deno::tools::test::TestFilter;

    deno_runtime::permissions::set_prompt_callbacks(
        Box::new(util::draw_thread::DrawThread::hide),
        Box::new(util::draw_thread::DrawThread::show),
    );
    let flags = args::Flags {
        unstable: true,
        config_flag: deno_config::ConfigFlag::Path(config_file.to_string_lossy().into()),
        ..Default::default()
    };

    let bench_options = args::BenchOptions {
        ..args::BenchOptions::resolve(Some(deno_config::BenchConfig { files }), None)?
    };
    let cli_factory = factory::CliFactory::from_flags(flags)
        .await?
        .with_custom_ext_cb(custom_extensions);
    let options = cli_factory.cli_options();

    // Various bench files should not share the same permissions in terms of
    // `PermissionsContainer` - otherwise granting/revoking permissions in one
    // file would have impact on other files, which is undesirable.
    let permissions = deno_runtime::permissions::Permissions::from_options(&permissions)?;

    let specifiers = util::fs::collect_specifiers(&bench_options.files, is_supported_bench_path)?;

    if specifiers.is_empty() {
        return Err(deno_core::error::generic_error("No bench modules found"));
    }

    check_specifiers(
        options,
        cli_factory.module_load_preparer().await?,
        specifiers.clone(),
    )
    .await?;

    if bench_options.no_run {
        return Ok(());
    }

    let log_level = options.log_level();
    let worker_factory = Arc::new(cli_factory.create_cli_main_worker_factory().await?);
    bench_specifiers(
        worker_factory,
        &permissions,
        specifiers,
        BenchSpecifierOptions {
            filter: TestFilter::from_flag(&bench_options.filter),
            json: bench_options.json,
            log_level,
        },
    )
    .await?;
    Ok(())
}
