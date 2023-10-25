#![allow(dead_code, clippy::let_and_return)]

use deno::*;

use std::sync::Arc;

#[allow(unused_imports)]
pub(crate) use log::{debug, error, info, trace, warn};

#[rustfmt::skip] 
use deno_runtime::deno_core as deno_core; // necessary for re-exported macros to work

use std::path::{Path, PathBuf};

pub fn start_sync(main_mod: PathBuf, config_file: PathBuf, lock_file: PathBuf) {
    deno_runtime::tokio_util::create_and_run_current_thread_with_maybe_metrics(async move {
        start(&main_mod, &config_file, lock_file).await.unwrap();
    });
}

pub async fn start(main_mod: &Path, config_file: &Path, lock_file: PathBuf) -> anyhow::Result<()> {
    deno_runtime::permissions::set_prompt_callbacks(
        Box::new(util::draw_thread::DrawThread::hide),
        Box::new(util::draw_thread::DrawThread::show),
    );
    let cwd = std::env::current_dir()?;
    let main_module = deno_core::resolve_url_or_path("", main_mod)?;
    let config_file = deno_core::resolve_url_or_path("", config_file)?;

    // the deno.json file
    let config_file = deno_config::ConfigFile::from_specifier(config_file)?;

    // the deno.lock file
    let lock_file = args::Lockfile::new(lock_file, false)?;

    let flags = args::Flags {
        allow_all: true,
        unstable: true,
        ..Default::default()
    };
    let options = args::CliOptions::new(
        flags,
        cwd.clone(),
        Some(config_file),
        Some(Arc::new(lock_file.into())),
        None,
    )?;
    let options = Arc::new(options);

    let cli_factory = factory::CliFactoryBuilder::new().build_from_cli_options(options);

    let worker_factory = cli_factory.create_cli_main_worker_factory().await?;
    let root_perms = deno_runtime::permissions::PermissionsContainer::allow_all();
    let extensions = vec![i_metatype_ext::init_ops_and_esm()];
    let stdio = deno_runtime::deno_io::Stdio::default(); // inherits by default
    let mut worker = worker_factory
        .create_custom_worker(main_module, root_perms, extensions, stdio)
        .await?;
    info!("running worker");
    let exit_code = worker.run().await?;
    println!("exit_code: {exit_code}");
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
