// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.

mod cache_dir;
mod common;
mod managed;

use std::path::PathBuf;
use std::sync::Arc;

use deno_ast::ModuleSpecifier;
use deno_core::error::AnyError;
use deno_runtime::deno_node::NpmResolver;
use deno_semver::package::PackageReq;

pub use self::cache_dir::NpmCacheDir;
pub use self::managed::CliNpmResolverManagedCreateOptions;
pub use self::managed::CliNpmResolverManagedSnapshotOption;
pub use self::managed::ManagedCliNpmResolver;

pub enum CliNpmResolverCreateOptions {
    Managed(CliNpmResolverManagedCreateOptions),
    // todo(dsherret): implement this
    #[allow(dead_code)]
    Byonm,
}

pub async fn create_cli_npm_resolver(
    options: CliNpmResolverCreateOptions,
) -> Result<Arc<dyn CliNpmResolver>, AnyError> {
    use CliNpmResolverCreateOptions::*;
    match options {
        Managed(options) => managed::create_managed_npm_resolver(options).await,
        Byonm => todo!(),
    }
}

pub enum InnerCliNpmResolverRef<'a> {
    Managed(&'a ManagedCliNpmResolver),
    #[allow(dead_code)]
    Byonm(&'a ByonmCliNpmResolver),
}

pub trait CliNpmResolver: NpmResolver {
    fn into_npm_resolver(self: Arc<Self>) -> Arc<dyn NpmResolver>;

    fn clone_snapshotted(&self) -> Arc<dyn CliNpmResolver>;

    fn as_inner(&self) -> InnerCliNpmResolverRef;

    fn as_managed(&self) -> Option<&ManagedCliNpmResolver> {
        match self.as_inner() {
            InnerCliNpmResolverRef::Managed(inner) => Some(inner),
            InnerCliNpmResolverRef::Byonm(_) => None,
        }
    }

    fn as_byonm(&self) -> Option<&ByonmCliNpmResolver> {
        match self.as_inner() {
            InnerCliNpmResolverRef::Managed(_) => None,
            InnerCliNpmResolverRef::Byonm(inner) => Some(inner),
        }
    }

    fn root_node_modules_path(&self) -> Option<PathBuf>;

    /// Resolve the root folder of the package the provided specifier is in.
    fn resolve_pkg_folder_from_specifier(
        &self,
        specifier: &ModuleSpecifier,
    ) -> Result<Option<PathBuf>, AnyError>;

    fn resolve_pkg_folder_from_deno_module_req(
        &self,
        req: &PackageReq,
        referrer: &ModuleSpecifier,
    ) -> Result<PathBuf, AnyError>;

    /// Gets the state of npm for the process.
    fn get_npm_process_state(&self) -> String;

    /// Returns a hash returning the state of the npm resolver
    /// or `None` if the state currently can't be determined.
    fn check_state_hash(&self) -> Option<u64>;
}

// todo(#18967): implement this
pub struct ByonmCliNpmResolver;
