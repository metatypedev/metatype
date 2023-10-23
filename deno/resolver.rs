// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
use deno_core::anyhow::anyhow;
use deno_core::error::AnyError;
use deno_core::futures::future;
use deno_core::futures::future::LocalBoxFuture;
use deno_core::futures::FutureExt;
use deno_core::ModuleSpecifier;
use deno_graph::source::NpmPackageReqResolution;
use deno_graph::source::NpmResolver;
use deno_graph::source::ResolveError;
use deno_graph::source::Resolver;
use deno_graph::source::UnknownBuiltInNodeModuleError;
use deno_graph::source::DEFAULT_JSX_IMPORT_SOURCE_MODULE;
use deno_runtime::deno_node::is_builtin_node_module;
use deno_semver::package::PackageReq;
use import_map::ImportMap;
use std::sync::Arc;

use crate::args::JsxImportSourceConfig;
use crate::npm::CliNpmResolver;
use crate::npm::InnerCliNpmResolverRef;
use crate::util::sync::AtomicFlag;

/// Result of checking if a specifier is mapped via
/// an import map or package.json.
pub enum MappedResolution {
    None,
    PackageJson(ModuleSpecifier),
    ImportMap(ModuleSpecifier),
}

impl MappedResolution {
    pub fn into_specifier(self) -> Option<ModuleSpecifier> {
        match self {
            MappedResolution::None => Option::None,
            MappedResolution::PackageJson(specifier) => Some(specifier),
            MappedResolution::ImportMap(specifier) => Some(specifier),
        }
    }
}

/// Resolver for specifiers that could be mapped via an
/// import map or package.json.
#[derive(Debug)]
pub struct MappedSpecifierResolver {
    maybe_import_map: Option<Arc<ImportMap>>,
}

impl MappedSpecifierResolver {
    pub fn new(maybe_import_map: Option<Arc<ImportMap>>) -> Self {
        Self { maybe_import_map }
    }

    pub fn resolve(
        &self,
        specifier: &str,
        referrer: &ModuleSpecifier,
    ) -> Result<MappedResolution, AnyError> {
        // attempt to resolve with the import map first
        let maybe_import_map_err = match self
            .maybe_import_map
            .as_ref()
            .map(|import_map| import_map.resolve(specifier, referrer))
        {
            Some(Ok(value)) => return Ok(MappedResolution::ImportMap(value)),
            Some(Err(err)) => Some(err),
            None => None,
        };

        // otherwise, surface the import map error or try resolving when has no import map
        if let Some(err) = maybe_import_map_err {
            Err(err.into())
        } else {
            Ok(MappedResolution::None)
        }
    }
}

/// A resolver that takes care of resolution, taking into account loaded
/// import map, JSX settings.
#[derive(Debug)]
pub struct CliGraphResolver {
    mapped_specifier_resolver: MappedSpecifierResolver,
    maybe_default_jsx_import_source: Option<String>,
    maybe_jsx_import_source_module: Option<String>,
    npm_resolver: Option<Arc<dyn CliNpmResolver>>,
    found_package_json_dep_flag: Arc<AtomicFlag>,
}

pub struct CliGraphResolverOptions {
    pub maybe_jsx_import_source_config: Option<JsxImportSourceConfig>,
    pub maybe_import_map: Option<Arc<ImportMap>>,
}

impl CliGraphResolver {
    pub fn new(
        npm_resolver: Option<Arc<dyn CliNpmResolver>>,
        options: CliGraphResolverOptions,
    ) -> Self {
        Self {
            mapped_specifier_resolver: MappedSpecifierResolver::new(options.maybe_import_map),
            maybe_default_jsx_import_source: options
                .maybe_jsx_import_source_config
                .as_ref()
                .and_then(|c| c.default_specifier.clone()),
            maybe_jsx_import_source_module: options
                .maybe_jsx_import_source_config
                .map(|c| c.module),
            npm_resolver,
            found_package_json_dep_flag: Default::default(),
        }
    }

    pub fn as_graph_resolver(&self) -> &dyn Resolver {
        self
    }

    pub fn as_graph_npm_resolver(&self) -> &dyn NpmResolver {
        self
    }

    pub fn found_package_json_dep(&self) -> bool {
        self.found_package_json_dep_flag.is_raised()
    }
}

impl Resolver for CliGraphResolver {
    fn default_jsx_import_source(&self) -> Option<String> {
        self.maybe_default_jsx_import_source.clone()
    }

    fn jsx_import_source_module(&self) -> &str {
        self.maybe_jsx_import_source_module
            .as_deref()
            .unwrap_or(DEFAULT_JSX_IMPORT_SOURCE_MODULE)
    }

    fn resolve(
        &self,
        specifier: &str,
        referrer: &ModuleSpecifier,
    ) -> Result<ModuleSpecifier, ResolveError> {
        let result = match self
            .mapped_specifier_resolver
            .resolve(specifier, referrer)?
        {
            MappedResolution::ImportMap(specifier) => Ok(specifier),
            MappedResolution::PackageJson(specifier) => {
                // found a specifier in the package.json, so mark that
                // we need to do an "npm install" later
                self.found_package_json_dep_flag.raise();
                Ok(specifier)
            }
            MappedResolution::None => {
                deno_graph::resolve_import(specifier, referrer).map_err(|err| err.into())
            }
        };

        result
    }
}

impl NpmResolver for CliGraphResolver {
    fn resolve_builtin_node_module(
        &self,
        specifier: &ModuleSpecifier,
    ) -> Result<Option<String>, UnknownBuiltInNodeModuleError> {
        if specifier.scheme() != "node" {
            return Ok(None);
        }

        let module_name = specifier.path().to_string();
        if is_builtin_node_module(&module_name) {
            Ok(Some(module_name))
        } else {
            Err(UnknownBuiltInNodeModuleError { module_name })
        }
    }

    fn load_and_cache_npm_package_info(
        &self,
        package_name: &str,
    ) -> LocalBoxFuture<'static, Result<(), AnyError>> {
        match &self.npm_resolver {
            Some(npm_resolver) if npm_resolver.as_managed().is_some() => {
                let package_name = package_name.to_string();
                let npm_resolver = npm_resolver.clone();
                async move {
                    if let Some(managed) = npm_resolver.as_managed() {
                        managed.cache_package_info(&package_name).await?;
                    }
                    Ok(())
                }
                .boxed()
            }
            _ => {
                // return it succeeded and error at the import site below
                Box::pin(future::ready(Ok(())))
            }
        }
    }

    fn resolve_npm(&self, package_req: &PackageReq) -> NpmPackageReqResolution {
        match &self.npm_resolver {
            Some(npm_resolver) => match npm_resolver.as_inner() {
                InnerCliNpmResolverRef::Managed(npm_resolver) => {
                    npm_resolver.resolve_npm_for_deno_graph(package_req)
                }
                // if we are using byonm, then this should never be called because
                // we don't use deno_graph's npm resolution in this case
                InnerCliNpmResolverRef::Byonm(_) => unreachable!(),
            },
            None => NpmPackageReqResolution::Err(anyhow!(
                "npm specifiers were requested; but --no-npm is specified"
            )),
        }
    }

    fn on_resolve_bare_builtin_node_module(&self, module_name: &str, range: &deno_graph::Range) {
        log::warn!(
            "bare specifier resolved to builtin node module {module_name} when importing {range}. you're to be discouraged from this pattern!"
        );
    }
}
