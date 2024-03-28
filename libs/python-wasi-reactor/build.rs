// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::Path;

use wlr_assets::bld_cfg::LibsConfig;
use wlr_assets::download_asset;

const WASI_DEPS_PATH: &str = "target/wasm32-wasi/wasi-deps";

const WASI_SDK_SYSROOT_URL: &str = "https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-19/wasi-sysroot-19.0.tar.gz";
const WASI_SDK_CLANG_BUILTINS_URL: &str = "https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-19/libclang_rt.builtins-wasm32-wasi-19.0.tar.gz";

fn main() {
    let mut libs_config = LibsConfig::new();

    let wasi_deps_path = Path::new(WASI_DEPS_PATH);

    download_asset(WASI_SDK_SYSROOT_URL, wasi_deps_path).unwrap();
    libs_config.add_lib_path(format!("{WASI_DEPS_PATH}/wasi-sysroot/lib/wasm32-wasi"));
    libs_config.add("wasi-emulated-signal");
    libs_config.add("wasi-emulated-getpid");
    libs_config.add("wasi-emulated-process-clocks");

    download_asset(WASI_SDK_CLANG_BUILTINS_URL, wasi_deps_path).unwrap();
    libs_config.add_lib_path(format!("{WASI_DEPS_PATH}/lib/wasi"));
    libs_config.add("clang_rt.builtins-wasm32");

    libs_config.add_lib_path("vendor/libpython/lib/wasm32-wasi".to_string());
    libs_config.add("python3.11");

    //libs_config.add_lib_path("vendor/wasi-vfs/lib".to_string());
    //libs_config.add("wasi_vfs");

    #[cfg(feature = "wasm")]
    libs_config.emit_link_flags();
}
