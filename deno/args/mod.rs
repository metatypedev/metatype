// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
mod import_map;
mod lockfile;

pub use self::import_map::resolve_import_map_from_specifier;
use ::import_map::ImportMap;
use deno_npm::resolution::ValidSerializedNpmResolutionSnapshot;
use deno_npm::NpmSystemInfo;
use deno_runtime::deno_tls::RootCertStoreProvider;
use deno_semver::npm::NpmPackageReqReference;

pub use deno_config::BenchConfig;
pub use deno_config::CompilerOptions;
pub use deno_config::ConfigFile;
pub use deno_config::EmitConfigOptions;
pub use deno_config::FilesConfig;
pub use deno_config::FmtOptionsConfig;
pub use deno_config::JsxImportSourceConfig;
pub use deno_config::LintRulesConfig;
pub use deno_config::ProseWrap;
pub use deno_config::TsConfig;
pub use deno_config::TsConfigForEmit;
pub use deno_config::TsConfigType;
pub use deno_config::TsTypeLib;
pub use lockfile::Lockfile;
pub use lockfile::LockfileError;

use deno_ast::ModuleSpecifier;
use deno_core::anyhow::anyhow;
use deno_core::anyhow::Context;
use deno_core::error::AnyError;
use deno_core::normalize_path;
use deno_core::parking_lot::Mutex;
use deno_core::serde;
use deno_core::serde_json;
use deno_core::url::Url;
use deno_runtime::colors;
use deno_runtime::deno_tls::rustls;
use deno_runtime::deno_tls::rustls::RootCertStore;
use deno_runtime::deno_tls::rustls_native_certs::load_native_certs;
use deno_runtime::deno_tls::rustls_pemfile;
use deno_runtime::deno_tls::webpki_roots;
use deno_runtime::permissions::PermissionsOptions;
use once_cell::sync::Lazy;
use once_cell::sync::OnceCell;
use serde::Deserialize;
use serde::Serialize;
use std::env;
use std::io::BufReader;
use std::path::Path;
use std::path::PathBuf;
use std::sync::Arc;
use thiserror::Error;

use crate::file_fetcher::FileFetcher;
use crate::util::glob::expand_globs;

static NPM_REGISTRY_DEFAULT_URL: Lazy<Url> = Lazy::new(|| {
    let env_var_name = "NPM_CONFIG_REGISTRY";
    if let Ok(registry_url) = std::env::var(env_var_name) {
        // ensure there is a trailing slash for the directory
        let registry_url = format!("{}/", registry_url.trim_end_matches('/'));
        match Url::parse(&registry_url) {
            Ok(url) => {
                return url;
            }
            Err(err) => {
                log::debug!("Invalid {} environment variable: {:#}", env_var_name, err,);
            }
        }
    }

    Url::parse("https://registry.npmjs.org").unwrap()
});

pub fn npm_registry_default_url() -> &'static Url {
    &NPM_REGISTRY_DEFAULT_URL
}

pub fn ts_config_to_emit_options(config: deno_config::TsConfig) -> deno_ast::EmitOptions {
    let options: deno_config::EmitConfigOptions = serde_json::from_value(config.0).unwrap();
    let imports_not_used_as_values = match options.imports_not_used_as_values.as_str() {
        "preserve" => deno_ast::ImportsNotUsedAsValues::Preserve,
        "error" => deno_ast::ImportsNotUsedAsValues::Error,
        _ => deno_ast::ImportsNotUsedAsValues::Remove,
    };
    let (transform_jsx, jsx_automatic, jsx_development) = match options.jsx.as_str() {
        "react" => (true, false, false),
        "react-jsx" => (true, true, false),
        "react-jsxdev" => (true, true, true),
        _ => (false, false, false),
    };
    deno_ast::EmitOptions {
        emit_metadata: options.emit_decorator_metadata,
        imports_not_used_as_values,
        inline_source_map: options.inline_source_map,
        inline_sources: options.inline_sources,
        source_map: options.source_map,
        jsx_automatic,
        jsx_development,
        jsx_factory: options.jsx_factory,
        jsx_fragment_factory: options.jsx_fragment_factory,
        jsx_import_source: options.jsx_import_source,
        transform_jsx,
        var_decl_imports: false,
    }
}

/// Indicates how cached source files should be handled.
#[derive(Debug, Clone, Eq, PartialEq)]
pub enum CacheSetting {
    /// Only the cached files should be used.  Any files not in the cache will
    /// error.  This is the equivalent of `--cached-only` in the CLI.
    Only,
    /// No cached source files should be used, and all files should be reloaded.
    /// This is the equivalent of `--reload` in the CLI.
    ReloadAll,
    /// Only some cached resources should be used.  This is the equivalent of
    /// `--reload=https://deno.land/std` or
    /// `--reload=https://deno.land/std,https://deno.land/x/example`.
    ReloadSome(Vec<String>),
    /// The usability of a cached value is determined by analyzing the cached
    /// headers and other metadata associated with a cached response, reloading
    /// any cached "non-fresh" cached responses.
    RespectHeaders,
    /// The cached source files should be used for local modules.  This is the
    /// default behavior of the CLI.
    Use,
}

impl CacheSetting {
    pub fn should_use_for_npm_package(&self, package_name: &str) -> bool {
        match self {
            CacheSetting::ReloadAll => false,
            CacheSetting::ReloadSome(list) => {
                if list.iter().any(|i| i == "npm:") {
                    return false;
                }
                let specifier = format!("npm:{package_name}");
                if list.contains(&specifier) {
                    return false;
                }
                true
            }
            _ => true,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BenchOptions {
    pub files: FilesConfig,
    pub filter: Option<String>,
    pub json: bool,
    pub no_run: bool,
}

struct CliRootCertStoreProvider {
    cell: OnceCell<RootCertStore>,
    maybe_root_path: Option<PathBuf>,
    maybe_ca_stores: Option<Vec<String>>,
    maybe_ca_data: Option<String>,
}

impl CliRootCertStoreProvider {
    pub fn new(
        maybe_root_path: Option<PathBuf>,
        maybe_ca_stores: Option<Vec<String>>,
        maybe_ca_data: Option<String>,
    ) -> Self {
        Self {
            cell: Default::default(),
            maybe_root_path,
            maybe_ca_stores,
            maybe_ca_data,
        }
    }
}

impl RootCertStoreProvider for CliRootCertStoreProvider {
    fn get_or_try_init(&self) -> Result<&RootCertStore, AnyError> {
        self.cell
            .get_or_try_init(|| {
                get_root_cert_store(
                    self.maybe_root_path.clone(),
                    self.maybe_ca_stores.clone(),
                    self.maybe_ca_data.clone(),
                )
            })
            .map_err(|e| e.into())
    }
}

#[derive(Error, Debug, Clone)]
pub enum RootCertStoreLoadError {
    #[error("Unknown certificate store \"{0}\" specified (allowed: \"system,mozilla\")")]
    UnknownStore(String),
    #[error("Unable to add pem file to certificate store: {0}")]
    FailedAddPemFile(String),
    #[error("Failed opening CA file: {0}")]
    CaFileOpenError(String),
}

/// Create and populate a root cert store based on the passed options and
/// environment.
pub fn get_root_cert_store(
    maybe_root_path: Option<PathBuf>,
    maybe_ca_stores: Option<Vec<String>>,
    maybe_ca_data: Option<String>,
) -> Result<RootCertStore, RootCertStoreLoadError> {
    let mut root_cert_store = RootCertStore::empty();
    let ca_stores: Vec<String> = maybe_ca_stores
        .or_else(|| {
            let env_ca_store = env::var("DENO_TLS_CA_STORE").ok()?;
            Some(
                env_ca_store
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect(),
            )
        })
        .unwrap_or_else(|| vec!["mozilla".to_string()]);

    for store in ca_stores.iter() {
        match store.as_str() {
            "mozilla" => {
                root_cert_store.add_trust_anchors(webpki_roots::TLS_SERVER_ROOTS.iter().map(
                    |ta| {
                        rustls::OwnedTrustAnchor::from_subject_spki_name_constraints(
                            ta.subject,
                            ta.spki,
                            ta.name_constraints,
                        )
                    },
                ));
            }
            "system" => {
                let roots = load_native_certs().expect("could not load platform certs");
                for root in roots {
                    root_cert_store
                        .add(&rustls::Certificate(root.0))
                        .expect("Failed to add platform cert to root cert store");
                }
            }
            _ => {
                return Err(RootCertStoreLoadError::UnknownStore(store.clone()));
            }
        }
    }

    let ca_data = maybe_ca_data.or_else(|| env::var("DENO_CERT").ok());
    if let Some(ca_file) = ca_data {
        let ca_file = if let Some(root) = &maybe_root_path {
            root.join(&ca_file)
        } else {
            PathBuf::from(ca_file)
        };
        let certfile = std::fs::File::open(ca_file)
            .map_err(|err| RootCertStoreLoadError::CaFileOpenError(err.to_string()))?;
        let mut reader = BufReader::new(certfile);

        match rustls_pemfile::certs(&mut reader) {
            Ok(certs) => {
                root_cert_store.add_parsable_certificates(&certs);
            }
            Err(e) => {
                return Err(RootCertStoreLoadError::FailedAddPemFile(e.to_string()));
            }
        }
    }

    Ok(root_cert_store)
}

/// State provided to the process via an environment variable.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(crate = "serde")]
pub struct NpmProcessState {
    pub snapshot: deno_npm::resolution::SerializedNpmResolutionSnapshot,
    pub local_node_modules_path: Option<String>,
}

const RESOLUTION_STATE_ENV_VAR_NAME: &str = "DENO_DONT_USE_INTERNAL_NODE_COMPAT_STATE";

static NPM_PROCESS_STATE: Lazy<Option<NpmProcessState>> = Lazy::new(|| {
    let state = std::env::var(RESOLUTION_STATE_ENV_VAR_NAME).ok()?;
    let state: NpmProcessState = serde_json::from_str(&state).ok()?;
    // remove the environment variable so that sub processes
    // that are spawned do not also use this.
    std::env::remove_var(RESOLUTION_STATE_ENV_VAR_NAME);
    Some(state)
});

/// Overrides for the options below that when set will
/// use these values over the values derived from the
/// CLI flags or config file.
#[derive(Default, Clone)]
struct CliOptionOverrides {
    import_map_specifier: Option<Option<ModuleSpecifier>>,
}

/// Holds the resolved options of many sources used by subcommands
/// and provides some helper function for creating common objects.
pub struct CliOptions {
    // the source of the options is a detail the rest of the
    // application need not concern itself with, so keep these private
    initial_cwd: PathBuf,
    maybe_config_file: Option<ConfigFile>,
    maybe_lockfile: Option<Arc<Mutex<Lockfile>>>,
    overrides: CliOptionOverrides,
    insecure_allowlist: Option<Vec<String>>,
    import_map_path: Option<String>,
}

impl CliOptions {
    pub fn new(
        initial_cwd: PathBuf,
        maybe_config_file: Option<ConfigFile>,
        maybe_lockfile: Option<Arc<Mutex<Lockfile>>>,
        insecure_allowlist: Option<Vec<String>>,
        import_map_path: Option<String>,
    ) -> Result<Self, AnyError> {
        if let Some(insecure_allowlist) = insecure_allowlist.as_ref() {
            let domains = if insecure_allowlist.is_empty() {
                "for all hostnames".to_string()
            } else {
                format!("for: {}", insecure_allowlist.join(", "))
            };
            let msg = format!("DANGER: TLS certificate validation is disabled {domains}");
            // use eprintln instead of log::warn so this always gets shown
            eprintln!("{}", colors::yellow(msg));
        }

        Ok(Self {
            initial_cwd,
            maybe_config_file,
            maybe_lockfile,
            insecure_allowlist,
            import_map_path,
            overrides: Default::default(),
        })
    }

    #[inline(always)]
    pub fn initial_cwd(&self) -> &Path {
        &self.initial_cwd
    }

    pub fn maybe_config_file_specifier(&self) -> Option<ModuleSpecifier> {
        self.maybe_config_file.as_ref().map(|f| f.specifier.clone())
    }

    /*pub fn ts_type_lib_window(&self) -> TsTypeLib {
        TsTypeLib::DenoWindow
    }

    pub fn ts_type_lib_worker(&self) -> TsTypeLib {
        TsTypeLib::DenoWorker
    }*/

    pub fn cache_setting(&self) -> CacheSetting {
        CacheSetting::Use
    }

    pub fn npm_system_info(&self) -> NpmSystemInfo {
        NpmSystemInfo::default()
    }

    /// Based on an optional command line import map path and an optional
    /// configuration file, return a resolved module specifier to an import map
    /// and a boolean indicating if unknown keys should not result in diagnostics.
    pub fn resolve_import_map_specifier(&self) -> Result<Option<ModuleSpecifier>, AnyError> {
        match self.overrides.import_map_specifier.clone() {
            Some(maybe_path) => Ok(maybe_path),
            None => resolve_import_map_specifier(
                self.import_map_path.as_deref(),
                self.maybe_config_file.as_ref(),
                &self.initial_cwd,
            ),
        }
    }

    pub async fn resolve_import_map(
        &self,
        file_fetcher: &FileFetcher,
    ) -> Result<Option<ImportMap>, AnyError> {
        let import_map_specifier = match self.resolve_import_map_specifier()? {
            Some(specifier) => specifier,
            None => return Ok(None),
        };
        resolve_import_map_from_specifier(
            &import_map_specifier,
            self.maybe_config_file().as_ref(),
            file_fetcher,
        )
        .await
        .with_context(|| format!("Unable to load '{import_map_specifier}' import map"))
        .map(Some)
    }

    pub fn resolve_npm_resolution_snapshot(
        &self,
    ) -> Result<Option<ValidSerializedNpmResolutionSnapshot>, AnyError> {
        if let Some(state) = &*NPM_PROCESS_STATE {
            // TODO(bartlomieju): remove this clone
            Ok(Some(state.snapshot.clone().into_valid()?))
        } else {
            Ok(None)
        }
    }

    // If the main module should be treated as being in an npm package.
    // This is triggered via a secret environment variable which is used
    // for functionality like child_process.fork. Users should NOT depend
    // on this functionality.
    pub fn is_npm_main(&self) -> bool {
        NPM_PROCESS_STATE.is_some()
    }

    /// Overrides the import map specifier to use.
    pub fn set_import_map_specifier(&mut self, path: Option<ModuleSpecifier>) {
        self.overrides.import_map_specifier = Some(path);
    }

    pub fn has_node_modules_dir(&self) -> bool {
        false
    }
    /*pub fn resolve_root_cert_store_provider(&self) -> Arc<dyn RootCertStoreProvider> {
        Arc::new(CliRootCertStoreProvider::new(
            None,
            self.flags.ca_stores.clone(),
            self.flags.ca_data.clone(),
        ))
    }*/

    pub fn resolve_ts_config_for_emit(
        &self,
        config_type: TsConfigType,
    ) -> Result<TsConfigForEmit, AnyError> {
        deno_config::get_ts_config_for_emit(config_type, self.maybe_config_file.as_ref())
    }

    pub fn maybe_lockfile(&self) -> Option<Arc<Mutex<Lockfile>>> {
        self.maybe_lockfile.clone()
    }

    /// Return any imports that should be brought into the scope of the module
    /// graph.
    pub fn to_maybe_imports(&self) -> Result<Vec<deno_graph::ReferrerImports>, AnyError> {
        if let Some(config_file) = &self.maybe_config_file {
            config_file.to_maybe_imports().map(|maybe_imports| {
                maybe_imports
                    .into_iter()
                    .map(|(referrer, imports)| deno_graph::ReferrerImports { referrer, imports })
                    .collect()
            })
        } else {
            Ok(Vec::new())
        }
    }

    pub fn maybe_config_file(&self) -> &Option<ConfigFile> {
        &self.maybe_config_file
    }

    /*pub fn resolve_bench_options(&self, bench_flags: BenchFlags) -> Result<BenchOptions, AnyError> {
        let maybe_bench_config = if let Some(config_file) = &self.maybe_config_file {
            config_file.to_bench_config()?
        } else {
            None
        };
        BenchOptions::resolve(maybe_bench_config, Some(bench_flags))
    }*/

    /*pub fn ca_data(&self) -> &Option<CaData> {
        &self.flags.ca_data
    }

    pub fn ca_stores(&self) -> &Option<Vec<String>> {
        &self.flags.ca_stores
    }*/

    pub fn log_level(&self) -> Option<log::Level> {
        None
    }

    /*
    pub fn maybe_custom_root(&self) -> &Option<PathBuf> {
        &self.flags.cache_path
    }

    pub fn no_prompt(&self) -> bool {
        resolve_no_prompt(&self.flags)
    }

    pub fn no_remote(&self) -> bool {
        self.flags.no_remote
    }

    pub fn no_npm(&self) -> bool {
        self.flags.no_npm
    }*/

    pub fn permissions_options(&self) -> PermissionsOptions {
        PermissionsOptions::default()
    }

    /*pub fn seed(&self) -> Option<u64> {
        self.flags.seed
    }*/

    pub fn unsafely_ignore_certificate_errors(&self) -> &Option<Vec<String>> {
        &self.insecure_allowlist
    }
}

fn resolve_import_map_specifier(
    maybe_import_map_path: Option<&str>,
    maybe_config_file: Option<&ConfigFile>,
    current_dir: &Path,
) -> Result<Option<ModuleSpecifier>, AnyError> {
    if let Some(import_map_path) = maybe_import_map_path {
        if let Some(config_file) = &maybe_config_file {
            if config_file.to_import_map_path().is_some() {
                log::warn!("{} the configuration file \"{}\" contains an entry for \"importMap\" that is being ignored.", colors::yellow("Warning"), config_file.specifier);
            }
        }
        let specifier = deno_core::resolve_url_or_path(import_map_path, current_dir)
            .with_context(|| format!("Bad URL (\"{import_map_path}\") for import map."))?;
        return Ok(Some(specifier));
    } else if let Some(config_file) = &maybe_config_file {
        // if the config file is an import map we prefer to use it, over `importMap`
        // field
        if config_file.is_an_import_map() {
            if let Some(_import_map_path) = config_file.to_import_map_path() {
                log::warn!("{} \"importMap\" setting is ignored when \"imports\" or \"scopes\" are specified in the config file.", colors::yellow("Warning"));
            }

            return Ok(Some(config_file.specifier.clone()));
        }

        // when the import map is specifier in a config file, it needs to be
        // resolved relative to the config file, versus the CWD like with the flag
        // and with config files, we support both local and remote config files,
        // so we have treat them differently.
        if let Some(import_map_path) = config_file.to_import_map_path() {
            // if the import map is an absolute URL, use it as is
            if let Ok(specifier) = deno_core::resolve_url(&import_map_path) {
                return Ok(Some(specifier));
            }
            let specifier =
          // with local config files, it might be common to specify an import
          // map like `"importMap": "import-map.json"`, which is resolvable if
          // the file is resolved like a file path, so we will coerce the config
          // file into a file path if possible and join the import map path to
          // the file path.
          if let Ok(config_file_path) = config_file.specifier.to_file_path() {
            let import_map_file_path = normalize_path(config_file_path
              .parent()
              .ok_or_else(|| {
                anyhow!("Bad config file specifier: {}", config_file.specifier)
              })?
              .join(&import_map_path));
            ModuleSpecifier::from_file_path(import_map_file_path).unwrap()
          // otherwise if the config file is remote, we have no choice but to
          // use "import resolution" with the config file as the base.
          } else {
            deno_core::resolve_import(&import_map_path, config_file.specifier.as_str())
              .with_context(|| format!(
                "Bad URL (\"{import_map_path}\") for import map."
              ))?
          };
            return Ok(Some(specifier));
        }
    }
    Ok(None)
}

/*
pub struct StorageKeyResolver(Option<Option<String>>);

impl StorageKeyResolver {
    pub fn from_options(options: &CliOptions) -> Self {
        Self(if let Some(location) = &options.flags.location {
            // if a location is set, then the ascii serialization of the location is
            // used, unless the origin is opaque, and then no storage origin is set, as
            // we can't expect the origin to be reproducible
            let storage_origin = location.origin();
            if storage_origin.is_tuple() {
                Some(Some(storage_origin.ascii_serialization()))
            } else {
                Some(None)
            }
        } else {
            // otherwise we will use the path to the config file or None to
            // fall back to using the main module's path
            options
                .maybe_config_file
                .as_ref()
                .map(|config_file| Some(config_file.specifier.to_string()))
        })
    }

    /// Creates a storage key resolver that will always resolve to being empty.
    pub fn empty() -> Self {
        Self(Some(None))
    }

    /// Resolves the storage key to use based on the current flags, config, or main module.
    pub fn resolve_storage_key(&self, main_module: &ModuleSpecifier) -> Option<String> {
        // use the stored value or fall back to using the path of the main module.
        if let Some(maybe_value) = &self.0 {
            maybe_value.clone()
        } else {
            Some(main_module.to_string())
        }
    }
}*/

/// Collect included and ignored files. CLI flags take precedence
/// over config file, i.e. if there's `files.ignore` in config file
/// and `--ignore` CLI flag, only the flag value is taken into account.
fn resolve_files(maybe_files_config: Option<FilesConfig>) -> Result<FilesConfig, AnyError> {
    let mut result = maybe_files_config.unwrap_or_default();
    // Now expand globs if there are any
    result.include = match result.include {
        Some(include) => Some(expand_globs(include)?),
        None => None,
    };
    result.exclude = expand_globs(result.exclude)?;

    Ok(result)
}

/// Resolves the no_prompt value based on the cli flags and environment.
pub fn resolve_no_prompt() -> bool {
    has_flag_env_var("DENO_NO_PROMPT")
}

pub fn has_flag_env_var(name: &str) -> bool {
    let value = env::var(name);
    matches!(value.as_ref().map(|s| s.as_str()), Ok("1"))
}

pub fn npm_pkg_req_ref_to_binary_command(req_ref: &NpmPackageReqReference) -> String {
    let binary_name = req_ref.sub_path().unwrap_or(req_ref.req().name.as_str());
    binary_name.to_string()
}

#[cfg(test)]
mod test {
    use super::*;
    use pretty_assertions::assert_eq;

    #[cfg(not(windows))]
    #[test]
    fn resolve_import_map_config_file() {
        let config_text = r#"{
      "importMap": "import_map.json"
    }"#;
        let config_specifier = ModuleSpecifier::parse("file:///deno/deno.jsonc").unwrap();
        let config_file = ConfigFile::new(config_text, config_specifier).unwrap();
        let actual = resolve_import_map_specifier(None, Some(&config_file), &PathBuf::from("/"));
        assert!(actual.is_ok());
        let actual = actual.unwrap();
        assert_eq!(
            actual,
            Some(ModuleSpecifier::parse("file:///deno/import_map.json").unwrap(),)
        );
    }

    #[test]
    fn resolve_import_map_remote_config_file_local() {
        let config_text = r#"{
      "importMap": "https://example.com/import_map.json"
    }"#;
        let config_specifier = ModuleSpecifier::parse("file:///deno/deno.jsonc").unwrap();
        let config_file = ConfigFile::new(config_text, config_specifier).unwrap();
        let actual = resolve_import_map_specifier(None, Some(&config_file), &PathBuf::from("/"));
        assert!(actual.is_ok());
        let actual = actual.unwrap();
        assert_eq!(
            actual,
            Some(ModuleSpecifier::parse("https://example.com/import_map.json").unwrap())
        );
    }

    #[test]
    fn resolve_import_map_config_file_remote() {
        let config_text = r#"{
      "importMap": "./import_map.json"
    }"#;
        let config_specifier = ModuleSpecifier::parse("https://example.com/deno.jsonc").unwrap();
        let config_file = ConfigFile::new(config_text, config_specifier).unwrap();
        let actual = resolve_import_map_specifier(None, Some(&config_file), &PathBuf::from("/"));
        assert!(actual.is_ok());
        let actual = actual.unwrap();
        assert_eq!(
            actual,
            Some(ModuleSpecifier::parse("https://example.com/import_map.json").unwrap())
        );
    }

    #[test]
    fn resolve_import_map_flags_take_precedence() {
        let config_text = r#"{
      "importMap": "import_map.json"
    }"#;
        let cwd = &std::env::current_dir().unwrap();
        let config_specifier = ModuleSpecifier::parse("file:///deno/deno.jsonc").unwrap();
        let config_file = ConfigFile::new(config_text, config_specifier).unwrap();
        let actual = resolve_import_map_specifier(Some("import-map.json"), Some(&config_file), cwd);
        let import_map_path = cwd.join("import-map.json");
        let expected_specifier = ModuleSpecifier::from_file_path(import_map_path).unwrap();
        assert!(actual.is_ok());
        let actual = actual.unwrap();
        assert_eq!(actual, Some(expected_specifier));
    }

    #[test]
    fn resolve_import_map_embedded_take_precedence() {
        let config_text = r#"{
      "importMap": "import_map.json",
      "imports": {},
    }"#;
        let config_specifier = ModuleSpecifier::parse("file:///deno/deno.jsonc").unwrap();
        let config_file = ConfigFile::new(config_text, config_specifier.clone()).unwrap();
        let actual = resolve_import_map_specifier(None, Some(&config_file), &PathBuf::from("/"));
        assert!(actual.is_ok());
        let actual = actual.unwrap();
        assert_eq!(actual, Some(config_specifier));
    }

    #[test]
    fn resolve_import_map_none() {
        let config_text = r#"{}"#;
        let config_specifier = ModuleSpecifier::parse("file:///deno/deno.jsonc").unwrap();
        let config_file = ConfigFile::new(config_text, config_specifier).unwrap();
        let actual = resolve_import_map_specifier(None, Some(&config_file), &PathBuf::from("/"));
        assert!(actual.is_ok());
        let actual = actual.unwrap();
        assert_eq!(actual, None);
    }

    #[test]
    fn resolve_import_map_no_config() {
        let actual = resolve_import_map_specifier(None, None, &PathBuf::from("/"));
        assert!(actual.is_ok());
        let actual = actual.unwrap();
        assert_eq!(actual, None);
    }
    /*
        #[test]
        fn storage_key_resolver_test() {
            let resolver = StorageKeyResolver(None);
            let specifier = ModuleSpecifier::parse("file:///a.ts").unwrap();
            assert_eq!(
                resolver.resolve_storage_key(&specifier),
                Some(specifier.to_string())
            );
            let resolver = StorageKeyResolver(Some(None));
            assert_eq!(resolver.resolve_storage_key(&specifier), None);
            let resolver = StorageKeyResolver(Some(Some("value".to_string())));
            assert_eq!(
                resolver.resolve_storage_key(&specifier),
                Some("value".to_string())
            );

            // test empty
            let resolver = StorageKeyResolver::empty();
            assert_eq!(resolver.resolve_storage_key(&specifier), None);
        }
    */
    #[test]
    fn resolve_files_test() {
        use test_util::TempDir;
        let temp_dir = TempDir::new();

        temp_dir.create_dir_all("data");
        temp_dir.create_dir_all("nested");
        temp_dir.create_dir_all("nested/foo");
        temp_dir.create_dir_all("nested/fizz");
        temp_dir.create_dir_all("pages");

        temp_dir.write("data/tes.ts", "");
        temp_dir.write("data/test1.js", "");
        temp_dir.write("data/test1.ts", "");
        temp_dir.write("data/test12.ts", "");

        temp_dir.write("nested/foo/foo.ts", "");
        temp_dir.write("nested/foo/bar.ts", "");
        temp_dir.write("nested/foo/fizz.ts", "");
        temp_dir.write("nested/foo/bazz.ts", "");

        temp_dir.write("nested/fizz/foo.ts", "");
        temp_dir.write("nested/fizz/bar.ts", "");
        temp_dir.write("nested/fizz/fizz.ts", "");
        temp_dir.write("nested/fizz/bazz.ts", "");

        temp_dir.write("pages/[id].ts", "");

        let temp_dir_path = temp_dir.path().as_path();
        let error = resolve_files(Some(FilesConfig {
            include: Some(vec![temp_dir_path.join("data/**********.ts")]),
            exclude: vec![],
        }))
        .unwrap_err();
        assert!(error.to_string().starts_with("Failed to expand glob"));

        let resolved_files = resolve_files(Some(FilesConfig {
            include: Some(vec![
                temp_dir_path.join("data/test1.?s"),
                temp_dir_path.join("nested/foo/*.ts"),
                temp_dir_path.join("nested/fizz/*.ts"),
                temp_dir_path.join("pages/[id].ts"),
            ]),
            exclude: vec![temp_dir_path.join("nested/**/*bazz.ts")],
        }))
        .unwrap();

        assert_eq!(
            resolved_files.include,
            Some(vec![
                temp_dir_path.join("data/test1.js"),
                temp_dir_path.join("data/test1.ts"),
                temp_dir_path.join("nested/foo/bar.ts"),
                temp_dir_path.join("nested/foo/bazz.ts"),
                temp_dir_path.join("nested/foo/fizz.ts"),
                temp_dir_path.join("nested/foo/foo.ts"),
                temp_dir_path.join("nested/fizz/bar.ts"),
                temp_dir_path.join("nested/fizz/bazz.ts"),
                temp_dir_path.join("nested/fizz/fizz.ts"),
                temp_dir_path.join("nested/fizz/foo.ts"),
                temp_dir_path.join("pages/[id].ts"),
            ])
        );
        assert_eq!(
            resolved_files.exclude,
            vec![
                temp_dir_path.join("nested/fizz/bazz.ts"),
                temp_dir_path.join("nested/foo/bazz.ts"),
            ]
        )
    }
}
