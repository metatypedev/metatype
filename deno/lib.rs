#![allow(dead_code, clippy::let_and_return)]

use deno::*;

// mod worker;
use crate::file_fetcher::FileFetcher;

use std::sync::Arc;

pub(crate) use deno_runtime::colors;
#[allow(unused_imports)]
pub(crate) use log::{debug, error, info, trace, warn};

#[rustfmt::skip]
use deno_runtime::{deno_core as deno_core, deno_fs, deno_node};
use std::path::{Path, PathBuf};

pub fn start_sync(main_mod: PathBuf, config_file: PathBuf) {
    deno_runtime::tokio_util::create_and_run_current_thread_with_maybe_metrics(async move {
        start_factory(&main_mod, &config_file).await.unwrap();
    });
}

pub async fn start_factory(main_mod: &Path, config_file: &Path) -> anyhow::Result<()> {
    deno_runtime::permissions::set_prompt_callbacks(
        Box::new(util::draw_thread::DrawThread::hide),
        Box::new(util::draw_thread::DrawThread::show),
    );
    let cwd = std::env::current_dir()?;
    let main_module = deno_core::resolve_url_or_path(
        // "../metatype/typegate/src/main.ts",
        // "main.ts",
        "", main_mod,
    )?;
    let config_file = deno_core::resolve_url_or_path(
        // "../metatype/typegate/deno.json",
        // "deno.json",
        "",
        config_file,
    )?;

    // the deno.json file
    let config_file = deno_config::ConfigFile::from_specifier(config_file)?;

    let flags = args::Flags {
        allow_all: true,
        unstable: true,
        ..Default::default()
    };
    let options = args::CliOptions::new(
        flags,
        cwd.clone(),
        Some(config_file),
        // TODO: lockfile
        None,
        None,
    )?;
    let options = Arc::new(options);

    let cli_factory = factory::CliFactoryBuilder::new().build_from_cli_options(options);

    let worker_factory = cli_factory.create_cli_main_worker_factory().await?;
    let root_perms = deno_runtime::permissions::PermissionsContainer::allow_all();
    let mut worker = worker_factory
        .create_main_worker(main_module, root_perms)
        .await?;
    info!("running worker");
    let exit_code = worker.run().await?;
    println!("exit_code: {exit_code}");
    Ok(())
}

pub async fn start(main_mod: &Path, config_file: &Path) -> anyhow::Result<()> {
    deno_runtime::permissions::set_prompt_callbacks(
        Box::new(util::draw_thread::DrawThread::hide),
        Box::new(util::draw_thread::DrawThread::show),
    );
    let cwd = std::env::current_dir()?;
    let main_module = deno_core::resolve_url_or_path(
        // "../metatype/typegate/src/main.ts",
        // "main.ts",
        "", main_mod,
    )?;
    let config_file = deno_core::resolve_url_or_path(
        // "../metatype/typegate/deno.json",
        // "deno.json",
        "",
        config_file,
    )?;

    // for displaying download progresses
    let text_progress_bar =
        util::progress_bar::ProgressBar::new(util::progress_bar::ProgressBarStyle::DownloadBars);

    // we want to use the cache
    let cache_settings = crate::args::CacheSetting::Use;
    // the deno.json file
    let config_file = deno_config::ConfigFile::from_specifier(config_file)?;
    let flags = args::Flags {
        allow_all: true,
        ..Default::default()
    };
    let options = args::CliOptions::new(
        flags,
        cwd.clone(),
        Some(config_file),
        // TODO: lockfile
        None,
        None,
    )?;
    let options = Arc::new(options);

    // the dir where downloaded and processed files are stored
    // let deno_dir = cache::DenoDir::new(Some(cwd.join(".metatype/deno")))?;
    let deno_dir = cache::DenoDirProvider::new(None);
    let deno_dir = Arc::new(deno_dir);

    // cache for transpiled modules
    let emit_cache = cache::EmitCache::new(deno_dir.get_or_create()?.gen_cache.clone());

    let caches = cache::Caches::new(deno_dir.clone());
    let caches = Arc::new(caches);

    // cache for dependency analysis
    let parsed_source_cache = cache::ParsedSourceCache::new(caches.dep_analysis_db());
    let parsed_source_cache = Arc::new(parsed_source_cache);

    // transpiler
    let emitter = emit::Emitter::new(
        emit_cache.clone(),
        parsed_source_cache.clone(),
        args::ts_config_to_emit_options(
            options
                .resolve_ts_config_for_emit(deno_config::TsConfigType::Emit)?
                .ts_config,
        ),
    );
    let emitter = Arc::new(emitter);

    // we're only interested in the code dependency graph, not the types
    let graph_kind = deno_graph::GraphKind::CodeOnly;

    // stores module graph in a Sync+Send way
    let graph_container = graph_util::ModuleGraphContainer::new(graph_kind);
    let graph_container = Arc::new(graph_container);

    // abstraction over fs
    let fs = deno_fs::RealFs;
    let fs = Arc::new(fs);

    // in memory Vec<u8> store abstraction used for sharing across different modules
    let blob_store = deno_runtime::deno_web::BlobStore::default();
    let blob_store = Arc::new(blob_store);

    let http_client = crate::http_util::HttpClient::new(None, None);
    let http_client = Arc::new(http_client);

    // caches http gets to disks
    let http_cache = crate::cache::GlobalHttpCache::new(
        deno_dir.get_or_create()?.deps_folder_path(),
        crate::cache::RealDenoCacheEnv,
    );
    let http_cache = Arc::new(http_cache);

    // abstraction that checks caches before getting from network
    let file_fetcher = FileFetcher::new(
        http_cache.clone(),
        cache_settings.clone(),
        true,
        http_client.clone(),
        blob_store.clone(),
        Some(text_progress_bar.clone()),
    );
    let file_fetcher = Arc::new(file_fetcher);

    let maybe_import_map = options
        .resolve_import_map(file_fetcher.as_ref())
        .await?
        .map(Arc::new);

    // NPM resolution is stored in a v8 snapshot
    let npm_resolution_snapshot = options.resolve_npm_resolution_snapshot()?;
    let npm_resolver = npm::create_cli_npm_resolver(npm::CliNpmResolverCreateOptions::Managed(
        npm::CliNpmResolverManagedCreateOptions {
            snapshot: npm::CliNpmResolverManagedSnapshotOption::Specified(npm_resolution_snapshot),
            maybe_lockfile: None, // TODO: lockfile
            fs: fs.clone(),
            http_client: http_client.clone(),
            cache_setting: cache_settings.clone(),
            npm_system_info: options.npm_system_info(),
            npm_registry_url: crate::args::npm_registry_default_url().clone(),
            npm_global_cache_dir: deno_dir.get_or_create()?.npm_folder_path(),
            text_only_progress_bar: text_progress_bar.clone(),
            maybe_node_modules_path: None,
            package_json_installer: npm::CliNpmResolverManagedPackageJsonInstallerOption::NoInstall,
        },
    ))
    .await?;

    let pkg_json_deps_provider = args::PackageJsonDepsProvider::new(None);
    let pkg_json_deps_provider = Arc::new(pkg_json_deps_provider);

    // abstraction over the graph for doing import resolution
    let graph_resolver = resolver::CliGraphResolver::new(
        Some(npm_resolver.clone()),
        pkg_json_deps_provider,
        resolver::CliGraphResolverOptions {
            maybe_import_map: maybe_import_map.clone(),
            maybe_jsx_import_source_config: None,
            maybe_vendor_dir: None,
            bare_node_builtins_enabled: false,
        },
    );
    let graph_resolver = Arc::new(graph_resolver);

    // commonjs resolution subset
    let cjs_res_store = module_loader::CjsResolutionStore::default();
    let cjs_res_store = Arc::new(cjs_res_store);

    // resolves node builtin modules
    let node_resolver =
        deno_node::NodeResolver::new(fs.clone(), npm_resolver.clone().into_npm_resolver());
    let node_resolver = Arc::new(node_resolver);

    // thin abstraction over deno_node::NodeResolver
    let cli_node_resolver = module_loader::CliNodeResolver::new(
        cjs_res_store.clone(),
        node_resolver.clone(),
        npm_resolver.clone(),
    );
    let cli_node_resolver = Arc::new(cli_node_resolver);

    let type_checker = tools::check::TypeChecker::new(
        caches.clone(),
        options.clone(),
        node_resolver.clone(),
        npm_resolver.clone(),
    );
    let type_checker = Arc::new(type_checker);

    // builds the graph as needed by consulting cache, network and the different resolvers
    let graph_builder = graph_util::ModuleGraphBuilder::new(
        options.clone(),
        graph_resolver.clone(),
        npm_resolver.clone(),
        parsed_source_cache.clone(),
        None, // TODO: lockfile
        None,
        emit_cache,
        file_fetcher.clone(),
        http_cache.clone(),
        type_checker.clone(),
    );
    let graph_builder = Arc::new(graph_builder);

    // "preparer" i.e. we want to load the module before it's needed for perf reasons
    let module_loader_pre = module_loader::ModuleLoadPreparer::new(
        options.clone(),
        graph_container.clone(),
        None, // TODO: lockfile
        None,
        graph_builder.clone(),
        parsed_source_cache.clone(),
        text_progress_bar.clone(),
        graph_resolver.clone(),
        type_checker.clone(),
    );
    let module_loader_pre = Arc::new(module_loader_pre);

    // CJS module metadata is gotten through analysis
    // this caches that
    let node_analysis_cache = cache::NodeAnalysisCache::new(caches.node_analysis_db());

    // CJS specific analyzer
    let cli_cjs_analyzer = node::CliCjsCodeAnalyzer::new(node_analysis_cache, fs.clone());

    // translates CJS modules to ESM modules
    let node_code_transl = node::CliNodeCodeTranslator::new(
        cli_cjs_analyzer,
        fs.clone(),
        node_resolver.clone(),
        npm_resolver.clone().into_npm_resolver(),
    );
    let node_code_transl = Arc::new(node_code_transl);

    // npm specific module loader
    let npm_module_loader = module_loader::NpmModuleLoader::new(
        cjs_res_store.clone(),
        node_code_transl.clone(),
        fs.clone(),
        cli_node_resolver.clone(),
    );
    let module_loader_fact = module_loader::CliModuleLoaderFactory::new(
        &options,
        emitter.clone(),
        graph_container.clone(),
        module_loader_pre.clone(),
        parsed_source_cache.clone(),
        graph_resolver.clone(),
        cli_node_resolver.clone(),
        npm_module_loader,
    );

    let root_perms = deno_runtime::permissions::PermissionsContainer::allow_all();
    let dyn_perms = deno_runtime::permissions::PermissionsContainer::allow_all();

    use worker::ModuleLoaderFactory; // bring trait in scoe
    let module_loader = module_loader_fact.create_for_main(root_perms.clone(), dyn_perms.clone());

    let mut feature_checker = deno_core::FeatureChecker::default();
    feature_checker.enable_legacy_unstable();
    feature_checker.set_exit_cb(Box::new(|_feature, api_name| {
        // TODO(bartlomieju): change to "The `--unstable-{feature}` flag must be provided.".
        eprintln!("Unstable API '{api_name}'. The --unstable flag must be provided.");
        std::process::exit(70);
    }));
    feature_checker.set_warn_cb(Box::new(|feat| {
        warn!("FeatureChecker warn: {feat}");
    }));
    let feature_checker = Arc::new(feature_checker);

    deno_core::JsRuntime::init_platform(None);
    let mut worker = deno_runtime::worker::MainWorker::bootstrap_from_options(
        main_module.clone(),
        deno_runtime::permissions::PermissionsContainer::allow_all(),
        deno_runtime::worker::WorkerOptions {
            bootstrap: deno_runtime::BootstrapOptions {
                cpu_count: std::thread::available_parallelism()
                    .map(|p| p.get())
                    .unwrap_or(1),
                locale: deno_core::v8::icu::get_language_tag(),
                is_tty: colors::is_tty(),
                unstable: true,
                // log_level: todo!()
                ..Default::default()
            },
            extensions: vec![i_metatype_ext::init_ops_and_esm()],
            module_loader,
            blob_store,
            fs: fs.clone(),
            npm_resolver: Some(npm_resolver.into_npm_resolver()),
            feature_checker,
            // npm_resolver: todo!(),
            ..Default::default()
        },
    );
    info!("running worker");
    worker.execute_main_module(&main_module).await?;
    let exit_code = worker.exit_code();
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
