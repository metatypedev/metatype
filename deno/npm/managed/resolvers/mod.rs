// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.

mod common;
mod global;

use std::sync::Arc;

use deno_core::url::Url;
use deno_npm::NpmSystemInfo;
use deno_runtime::deno_fs::FileSystem;

use crate::util::progress_bar::ProgressBar;

pub use self::common::NpmPackageFsResolver;

use self::global::GlobalNpmPackageResolver;

use super::cache::NpmCache;
use super::resolution::NpmResolution;

pub fn create_npm_fs_resolver(
    fs: Arc<dyn FileSystem>,
    cache: Arc<NpmCache>,
    _progress_bar: &ProgressBar, // previously used for the `node_modules` resolver
    registry_url: Url,
    resolution: Arc<NpmResolution>,
    system_info: NpmSystemInfo,
) -> Arc<dyn NpmPackageFsResolver> {
    Arc::new(GlobalNpmPackageResolver::new(
        fs,
        cache,
        registry_url,
        resolution,
        system_info,
    ))
}
