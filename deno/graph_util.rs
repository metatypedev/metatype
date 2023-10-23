// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
use crate::args::CliOptions;
use crate::args::Lockfile;
use crate::args::TsTypeLib;
use crate::cache;
use crate::cache::GlobalHttpCache;
use crate::cache::ParsedSourceCache;
use crate::colors;
use crate::errors::get_error_class_name;
use crate::file_fetcher::FileFetcher;
use crate::npm::CliNpmResolver;
use crate::resolver::CliGraphResolver;
use crate::util::sync::TaskQueue;
use crate::util::sync::TaskQueuePermit;

use deno_core::anyhow::bail;
use deno_core::error::custom_error;
use deno_core::error::AnyError;
use deno_core::parking_lot::Mutex;
use deno_core::parking_lot::RwLock;
use deno_core::ModuleSpecifier;
use deno_graph::source::Loader;
use deno_graph::GraphKind;
use deno_graph::Module;
use deno_graph::ModuleError;
use deno_graph::ModuleGraph;
use deno_graph::ModuleGraphError;
use deno_graph::ResolutionError;
use deno_graph::SpecifierError;
use deno_runtime::deno_node;
use deno_runtime::permissions::PermissionsContainer;
use deno_semver::package::PackageNv;
use deno_semver::package::PackageReq;
use std::collections::HashSet;
use std::sync::Arc;

#[derive(Clone, Copy)]
pub struct GraphValidOptions {
    pub check_js: bool,
    pub follow_type_only: bool,
    pub is_vendoring: bool,
}

/// Check if `roots` and their deps are available. Returns `Ok(())` if
/// so. Returns `Err(_)` if there is a known module graph or resolution
/// error statically reachable from `roots` and not a dynamic import.
pub fn graph_valid_with_cli_options(
    graph: &ModuleGraph,
    roots: &[ModuleSpecifier],
    _options: &CliOptions, // this was used to enable checking but we're no longer doing that
) -> Result<(), AnyError> {
    graph_valid(
        graph,
        roots,
        GraphValidOptions {
            is_vendoring: false,
            follow_type_only: false,
            check_js: false,
        },
    )
}

/// Check if `roots` and their deps are available. Returns `Ok(())` if
/// so. Returns `Err(_)` if there is a known module graph or resolution
/// error statically reachable from `roots`.
///
/// It is preferable to use this over using deno_graph's API directly
/// because it will have enhanced error message information specifically
/// for the CLI.
pub fn graph_valid(
    graph: &ModuleGraph,
    roots: &[ModuleSpecifier],
    options: GraphValidOptions,
) -> Result<(), AnyError> {
    let mut errors = graph
        .walk(
            roots,
            deno_graph::WalkOptions {
                check_js: options.check_js,
                follow_type_only: options.follow_type_only,
                follow_dynamic: options.is_vendoring,
            },
        )
        .errors()
        .flat_map(|error| {
            let is_root = match &error {
                ModuleGraphError::ResolutionError(_) => false,
                ModuleGraphError::ModuleError(error) => roots.contains(error.specifier()),
            };
            let mut message = if let ModuleGraphError::ResolutionError(err) = &error {
                enhanced_resolution_error_message(err)
            } else {
                format!("{error}")
            };

            if let Some(range) = error.maybe_range() {
                if !is_root && !range.specifier.as_str().contains("/$deno$eval") {
                    message.push_str(&format!(
                        "\n    at {}:{}:{}",
                        colors::cyan(range.specifier.as_str()),
                        colors::yellow(&(range.start.line + 1).to_string()),
                        colors::yellow(&(range.start.character + 1).to_string())
                    ));
                }
            }

            if options.is_vendoring {
                // warn about failing dynamic imports when vendoring, but don't fail completely
                if matches!(
                    error,
                    ModuleGraphError::ModuleError(ModuleError::MissingDynamic(_, _))
                ) {
                    log::warn!("Ignoring: {:#}", message);
                    return None;
                }

                // ignore invalid downgrades and invalid local imports when vendoring
                if let ModuleGraphError::ResolutionError(err) = &error {
                    if matches!(
                        err,
                        ResolutionError::InvalidDowngrade { .. }
                            | ResolutionError::InvalidLocalImport { .. }
                    ) {
                        return None;
                    }
                }
            }

            Some(custom_error(get_error_class_name(&error.into()), message))
        });
    if let Some(error) = errors.next() {
        Err(error)
    } else {
        Ok(())
    }
}

/// Checks the lockfile against the graph and and exits on errors.
pub fn graph_lock_or_exit(graph: &ModuleGraph, lockfile: &mut Lockfile) {
    for module in graph.modules() {
        let source = match module {
            Module::Esm(module) if module.media_type.is_declaration() => continue, // skip declaration files
            Module::Esm(module) => &module.source,
            Module::Json(module) => &module.source,
            Module::Node(_) | Module::Npm(_) | Module::External(_) => continue,
        };
        if !lockfile.check_or_insert_remote(module.specifier().as_str(), source) {
            let err = format!(
                concat!(
          "The source code is invalid, as it does not match the expected hash in the lock file.\n",
          "  Specifier: {}\n",
          "  Lock file: {}",
        ),
                module.specifier(),
                lockfile.filename.display(),
            );
            log::error!("{} {}", colors::red("error:"), err);
            std::process::exit(10);
        }
    }
}

pub struct ModuleGraphBuilder {
    options: Arc<CliOptions>,
    resolver: Arc<CliGraphResolver>,
    npm_resolver: Arc<dyn CliNpmResolver>,
    parsed_source_cache: Arc<ParsedSourceCache>,
    lockfile: Option<Arc<Mutex<Lockfile>>>,
    emit_cache: cache::EmitCache,
    file_fetcher: Arc<FileFetcher>,
    global_http_cache: Arc<GlobalHttpCache>,
}

impl ModuleGraphBuilder {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        options: Arc<CliOptions>,
        resolver: Arc<CliGraphResolver>,
        npm_resolver: Arc<dyn CliNpmResolver>,
        parsed_source_cache: Arc<ParsedSourceCache>,
        lockfile: Option<Arc<Mutex<Lockfile>>>,
        emit_cache: cache::EmitCache,
        file_fetcher: Arc<FileFetcher>,
        global_http_cache: Arc<GlobalHttpCache>,
    ) -> Self {
        Self {
            options,
            resolver,
            npm_resolver,
            parsed_source_cache,
            lockfile,
            emit_cache,
            file_fetcher,
            global_http_cache,
        }
    }

    pub async fn create_graph_with_loader(
        &self,
        graph_kind: GraphKind,
        roots: Vec<ModuleSpecifier>,
        loader: &mut dyn Loader,
    ) -> Result<deno_graph::ModuleGraph, AnyError> {
        let maybe_imports = self.options.to_maybe_imports()?;

        let cli_resolver = self.resolver.clone();
        let graph_resolver = cli_resolver.as_graph_resolver();
        let graph_npm_resolver = cli_resolver.as_graph_npm_resolver();
        let analyzer = self.parsed_source_cache.as_analyzer();

        let mut graph = ModuleGraph::new(graph_kind);
        self.build_graph_with_npm_resolution(
            &mut graph,
            roots,
            loader,
            deno_graph::BuildOptions {
                is_dynamic: false,
                imports: maybe_imports,
                resolver: Some(graph_resolver),
                npm_resolver: Some(graph_npm_resolver),
                module_analyzer: Some(&*analyzer),
                reporter: None,
                // todo(dsherret): workspace support
                workspace_members: vec![],
            },
        )
        .await?;

        Ok(graph)
    }

    pub async fn create_graph_and_maybe_check(
        &self,
        roots: Vec<ModuleSpecifier>,
    ) -> Result<Arc<deno_graph::ModuleGraph>, AnyError> {
        let mut cache = self.create_graph_loader();
        let maybe_imports = self.options.to_maybe_imports()?;
        let cli_resolver = self.resolver.clone();
        let graph_resolver = cli_resolver.as_graph_resolver();
        let graph_npm_resolver = cli_resolver.as_graph_npm_resolver();
        let analyzer = self.parsed_source_cache.as_analyzer();
        let graph_kind = GraphKind::CodeOnly;
        let mut graph = ModuleGraph::new(graph_kind);

        self.build_graph_with_npm_resolution(
            &mut graph,
            roots,
            &mut cache,
            deno_graph::BuildOptions {
                is_dynamic: false,
                imports: maybe_imports,
                resolver: Some(graph_resolver),
                npm_resolver: Some(graph_npm_resolver),
                module_analyzer: Some(&*analyzer),
                reporter: None,
                // todo(dsherret): workspace support
                workspace_members: vec![],
            },
        )
        .await?;

        let graph = Arc::new(graph);
        graph_valid_with_cli_options(&graph, &graph.roots, &self.options)?;
        if let Some(lockfile) = &self.lockfile {
            graph_lock_or_exit(&graph, &mut lockfile.lock());
        }

        Ok(graph)
    }

    pub async fn build_graph_with_npm_resolution<'a>(
        &self,
        graph: &mut ModuleGraph,
        roots: Vec<ModuleSpecifier>,
        loader: &mut dyn deno_graph::source::Loader,
        options: deno_graph::BuildOptions<'a>,
    ) -> Result<(), AnyError> {
        // add the lockfile redirects to the graph if it's the first time executing
        if graph.redirects.is_empty() {
            if let Some(lockfile) = &self.lockfile {
                let lockfile = lockfile.lock();
                for (from, to) in &lockfile.content.redirects {
                    if let Ok(from) = ModuleSpecifier::parse(from) {
                        if let Ok(to) = ModuleSpecifier::parse(to) {
                            if !matches!(from.scheme(), "file" | "npm" | "jsr") {
                                graph.redirects.insert(from, to);
                            }
                        }
                    }
                }
            }
        }

        // add the jsr specifiers to the graph if it's the first time executing
        if graph.packages.is_empty() {
            if let Some(lockfile) = &self.lockfile {
                let lockfile = lockfile.lock();
                for (key, value) in &lockfile.content.packages.specifiers {
                    if let Some(key) = key
                        .strip_prefix("jsr:")
                        .and_then(|key| PackageReq::from_str(key).ok())
                    {
                        if let Some(value) = value
                            .strip_prefix("jsr:")
                            .and_then(|value| PackageNv::from_str(value).ok())
                        {
                            graph.packages.add(key, value);
                        }
                    }
                }
            }
        }

        graph.build(roots, loader, options).await;

        // add the redirects in the graph to the lockfile
        if !graph.redirects.is_empty() {
            if let Some(lockfile) = &self.lockfile {
                let graph_redirects = graph
                    .redirects
                    .iter()
                    .filter(|(from, _)| !matches!(from.scheme(), "npm" | "file" | "deno"));
                let mut lockfile = lockfile.lock();
                for (from, to) in graph_redirects {
                    lockfile.insert_redirect(from.to_string(), to.to_string());
                }
            }
        }

        // add the jsr specifiers in the graph to the lockfile
        if !graph.packages.is_empty() {
            if let Some(lockfile) = &self.lockfile {
                let mappings = graph.packages.mappings();
                let mut lockfile = lockfile.lock();
                for (from, to) in mappings {
                    lockfile
                        .insert_package_specifier(format!("jsr:{}", from), format!("jsr:{}", to));
                }
            }
        }

        if let Some(npm_resolver) = self.npm_resolver.as_managed() {
            // resolve the dependencies of any pending dependencies
            // that were inserted by building the graph
            npm_resolver.resolve_pending().await?;
        }

        Ok(())
    }

    /// Creates the default loader used for creating a graph.
    pub fn create_graph_loader(&self) -> cache::FetchCacher {
        self.create_fetch_cacher(PermissionsContainer::allow_all())
    }

    pub fn create_fetch_cacher(&self, permissions: PermissionsContainer) -> cache::FetchCacher {
        cache::FetchCacher::new(
            self.emit_cache.clone(),
            self.file_fetcher.clone(),
            Default::default(),
            self.global_http_cache.clone(),
            self.parsed_source_cache.clone(),
            permissions,
        )
    }

    pub async fn create_graph(
        &self,
        graph_kind: GraphKind,
        roots: Vec<ModuleSpecifier>,
    ) -> Result<deno_graph::ModuleGraph, AnyError> {
        let mut cache = self.create_graph_loader();
        self.create_graph_with_loader(graph_kind, roots, &mut cache)
            .await
    }
}

pub fn error_for_any_npm_specifier(graph: &ModuleGraph) -> Result<(), AnyError> {
    for module in graph.modules() {
        match module {
            Module::Npm(module) => {
                bail!("npm specifiers have not yet been implemented for this subcommand (https://github.com/denoland/deno/issues/15960). Found: {}", module.specifier)
            }
            Module::Node(module) => {
                bail!("Node specifiers have not yet been implemented for this subcommand (https://github.com/denoland/deno/issues/15960). Found: node:{}", module.module_name)
            }
            Module::Esm(_) | Module::Json(_) | Module::External(_) => {}
        }
    }
    Ok(())
}

/// Adds more explanatory information to a resolution error.
pub fn enhanced_resolution_error_message(error: &ResolutionError) -> String {
    let mut message = format!("{error}");

    if let Some(specifier) = get_resolution_error_bare_node_specifier(error) {
        message.push_str(&format!(
        "\nIf you want to use a built-in Node module, add a \"node:\" prefix (ex. \"node:{specifier}\")."
      ));
    }

    message
}

pub fn get_resolution_error_bare_node_specifier(error: &ResolutionError) -> Option<&str> {
    get_resolution_error_bare_specifier(error)
        .filter(|specifier| deno_node::is_builtin_node_module(specifier))
}

fn get_resolution_error_bare_specifier(error: &ResolutionError) -> Option<&str> {
    if let ResolutionError::InvalidSpecifier {
        error: SpecifierError::ImportPrefixMissing(specifier, _),
        ..
    } = error
    {
        Some(specifier.as_str())
    } else if let ResolutionError::ResolverError { specifier, .. } = error {
        Some(specifier.as_str())
    } else {
        None
    }
}

#[derive(Debug)]
struct GraphData {
    graph: Arc<ModuleGraph>,
    checked_libs: std::collections::HashMap<TsTypeLib, HashSet<ModuleSpecifier>>,
}

/// Holds the `ModuleGraph` and what parts of it are type checked.
pub struct ModuleGraphContainer {
    // Allow only one request to update the graph data at a time,
    // but allow other requests to read from it at any time even
    // while another request is updating the data.
    update_queue: Arc<TaskQueue>,
    graph_data: Arc<RwLock<GraphData>>,
}

impl ModuleGraphContainer {
    pub fn new(graph_kind: GraphKind) -> Self {
        Self {
            update_queue: Default::default(),
            graph_data: Arc::new(RwLock::new(GraphData {
                graph: Arc::new(ModuleGraph::new(graph_kind)),
                checked_libs: Default::default(),
            })),
        }
    }

    /// Acquires a permit to modify the module graph without other code
    /// having the chance to modify it. In the meantime, other code may
    /// still read from the existing module graph.
    pub async fn acquire_update_permit(&self) -> ModuleGraphUpdatePermit {
        let permit = self.update_queue.acquire().await;
        ModuleGraphUpdatePermit {
            permit,
            graph_data: self.graph_data.clone(),
            graph: (*self.graph_data.read().graph).clone(),
        }
    }

    pub fn graph(&self) -> Arc<ModuleGraph> {
        self.graph_data.read().graph.clone()
    }

    /// Mark `roots` and all of their dependencies as type checked under `lib`.
    /// Assumes that all of those modules are known.
    pub fn set_type_checked(&self, roots: &[ModuleSpecifier], lib: TsTypeLib) {
        // It's ok to analyze and update this while the module graph itself is
        // being updated in a permit because the module graph update is always
        // additive and this will be a subset of the original graph
        let graph = self.graph();
        let entries = graph.walk(
            roots,
            deno_graph::WalkOptions {
                check_js: true,
                follow_dynamic: true,
                follow_type_only: true,
            },
        );

        // now update
        let mut data = self.graph_data.write();
        let checked_lib_set = data.checked_libs.entry(lib).or_default();
        for (specifier, _) in entries {
            checked_lib_set.insert(specifier.clone());
        }
    }

    /// Check if `roots` are all marked as type checked under `lib`.
    pub fn is_type_checked(&self, roots: &[ModuleSpecifier], lib: TsTypeLib) -> bool {
        let data = self.graph_data.read();
        match data.checked_libs.get(&lib) {
            Some(checked_lib_set) => roots.iter().all(|r| {
                let found = data.graph.resolve(r);
                checked_lib_set.contains(&found)
            }),
            None => false,
        }
    }
}

/// Gets if any of the specified root's "file:" dependents are in the
/// provided changed set.
pub fn has_graph_root_local_dependent_changed(
    graph: &ModuleGraph,
    root: &ModuleSpecifier,
    changed_specifiers: &HashSet<ModuleSpecifier>,
) -> bool {
    let roots = vec![root.clone()];
    let mut dependent_specifiers = graph.walk(
        &roots,
        deno_graph::WalkOptions {
            follow_dynamic: true,
            follow_type_only: true,
            check_js: true,
        },
    );
    while let Some((s, _)) = dependent_specifiers.next() {
        if s.scheme() != "file" {
            // skip walking this remote module's dependencies
            dependent_specifiers.skip_previous_dependencies();
        } else if changed_specifiers.contains(s) {
            return true;
        }
    }
    false
}

/// A permit for updating the module graph. When complete and
/// everything looks fine, calling `.commit()` will store the
/// new graph in the ModuleGraphContainer.
pub struct ModuleGraphUpdatePermit<'a> {
    permit: TaskQueuePermit<'a>,
    graph_data: Arc<RwLock<GraphData>>,
    graph: ModuleGraph,
}

impl<'a> ModuleGraphUpdatePermit<'a> {
    /// Gets the module graph for mutation.
    pub fn graph_mut(&mut self) -> &mut ModuleGraph {
        &mut self.graph
    }

    /// Saves the mutated module graph in the container
    /// and returns an Arc to the new module graph.
    pub fn commit(self) -> Arc<ModuleGraph> {
        let graph = Arc::new(self.graph);
        self.graph_data.write().graph = graph.clone();
        drop(self.permit); // explicit drop for clarity
        graph
    }
}

#[cfg(test)]
mod test {
    use deno_ast::ModuleSpecifier;
    use deno_graph::Position;
    use deno_graph::Range;
    use deno_graph::ResolutionError;
    use deno_graph::SpecifierError;

    use crate::graph_util::get_resolution_error_bare_node_specifier;

    /*#[test]
    fn import_map_node_resolution_error() {
        let cases = vec![("fs", Some("fs")), ("other", None)];
        for (input, output) in cases {
            let import_map =
                import_map::ImportMap::new(ModuleSpecifier::parse("file:///deno.json").unwrap());
            let specifier = ModuleSpecifier::parse("file:///file.ts").unwrap();
            let err = import_map.resolve(input, &specifier).err().unwrap();
            let err = ResolutionError::ResolverError {
                error: Arc::new(err.into()),
                specifier: input.to_string(),
                range: Range {
                    specifier,
                    start: Position::zeroed(),
                    end: Position::zeroed(),
                },
            };
            assert_eq!(get_resolution_error_bare_node_specifier(&err), output);
        }
    }*/

    #[test]
    fn bare_specifier_node_resolution_error() {
        let cases = vec![("process", Some("process")), ("other", None)];
        for (input, output) in cases {
            let specifier = ModuleSpecifier::parse("file:///file.ts").unwrap();
            let err = ResolutionError::InvalidSpecifier {
                range: Range {
                    specifier,
                    start: Position::zeroed(),
                    end: Position::zeroed(),
                },
                error: SpecifierError::ImportPrefixMissing(input.to_string(), None),
            };
            assert_eq!(get_resolution_error_bare_node_specifier(&err), output,);
        }
    }
}
