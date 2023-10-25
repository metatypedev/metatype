#![allow(dead_code, clippy::let_and_return)]

pub use deno;

use deno::{
    deno_runtime::{
        deno_core::{futures::FutureExt, unsync::JoinHandle},
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

pub fn run_sync(main_mod: PathBuf) {
    create_and_run_current_thread_with_maybe_metrics(async move {
        spawn_subcommand(async move { run(&main_mod).await.unwrap() })
            .await
            .unwrap()
    });
}

pub async fn run(main_mod: &Path) -> anyhow::Result<()> {
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
    let options = args::CliOptions::from_flags(flags)?;
    let options = Arc::new(options);

    let cli_factory = factory::CliFactoryBuilder::new()
        .build_from_cli_options(options.clone())
        .with_custom_ext_cb(Arc::new(|| vec![i_metatype_ext::init_ops_and_esm()]));

    let worker_factory = cli_factory.create_cli_main_worker_factory().await?;
    let permissions = deno_runtime::permissions::PermissionsContainer::new(
        deno_runtime::permissions::Permissions::from_options(&options.permissions_options())?,
    );
    let mut worker = worker_factory
        .create_main_worker(main_module, permissions)
        .await?;
    info!("running worker");
    let exit_code = worker.run().await?;
    println!("exit_code: {exit_code}");
    Ok(())
}

pub fn test_sync(files: deno_config::FilesConfig, config_file: PathBuf) {
    create_and_run_current_thread_with_maybe_metrics(async move {
        spawn_subcommand(async move { test(files, config_file).await.unwrap() })
            .await
            .unwrap()
    });
}

pub async fn test(files: deno_config::FilesConfig, config_file: PathBuf) -> anyhow::Result<()> {
    use deno::tools::test::*;

    deno_runtime::permissions::set_prompt_callbacks(
        Box::new(util::draw_thread::DrawThread::hide),
        Box::new(util::draw_thread::DrawThread::show),
    );
    let flags = args::Flags {
        unstable: true,
        config_flag: deno_config::ConfigFlag::Path(config_file.to_string_lossy().into()),
        allow_run: Some(
            [
                "cargo",
                "hostname",
                "target/debug/meta",
                "git",
                "python3",
                "rm",
                "mkdir",
            ]
            .into_iter()
            .map(str::to_owned)
            .collect(),
        ),
        allow_sys: Some(vec![]),
        allow_env: Some(vec![]),
        allow_hrtime: true,
        allow_write: Some(
            ["tmp", "typegate/tests"]
                .into_iter()
                .map(std::str::FromStr::from_str)
                .collect::<Result<_, _>>()?,
        ),
        allow_ffi: Some(vec![]),
        allow_read: Some(
            vec![], // ["."]
                    //     .into_iter()
                    //     .map(std::str::FromStr::from_str)
                    //     .collect::<Result<_, _>>()?,
        ),
        allow_net: Some(vec![]),
        ..Default::default()
    };
    let options = args::CliOptions::from_flags(flags)?;
    let options = Arc::new(options);

    let cli_factory = factory::CliFactoryBuilder::new()
        .build_from_cli_options(options.clone())
        .with_custom_ext_cb(Arc::new(|| vec![i_metatype_ext::init_ops_and_esm()]));

    let test_options = args::TestOptions {
        doc: false,
        trace_ops: true,
        ..args::TestOptions::resolve(Some(deno_config::TestConfig { files }), None)?
    };
    let file_fetcher = cli_factory.file_fetcher()?;
    let module_load_preparer = cli_factory.module_load_preparer().await?;

    // Various test files should not share the same permissions in terms of
    // `PermissionsContainer` - otherwise granting/revoking permissions in one
    // file would have impact on other files, which is undesirable.
    let permissions =
        deno_runtime::permissions::Permissions::from_options(&options.permissions_options())?;

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

#[deno_core::op2(async)]
#[string]
async fn op_foobar() -> anyhow::Result<String> {
    Ok("making up a song 'bout Coraline".to_string())
}

deno_core::extension!(
    i_metatype_ext,
    ops = [op_foobar],
    esm_entry_point = "ext:i_metatype_ext/runtime.js",
    esm = ["runtime.js"],
    docs = "Metatype internal extension"
);
