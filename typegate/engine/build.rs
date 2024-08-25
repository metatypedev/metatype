// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    shadow_rs::new()?;

    // build and compress the `pyrt_wit_wire` wasm compress
    // into OUT_DIR/pyrt.cwasm.zst

    let cwd = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR")?);
    let out_dir = PathBuf::from(std::env::var("OUT_DIR")?);
    let target = std::env::var("TARGET")?;
    println!(
        "cargo:rerun-if-changed={}/main.py",
        cwd.join("../../libs/pyrt_wit_wire")
            .canonicalize()
            .unwrap()
            .to_string_lossy()
    );
    println!(
        "cargo:rerun-if-changed={}/wit-wire.wit",
        cwd.join("../../wit")
            .canonicalize()
            .unwrap()
            .to_string_lossy()
    );

    let wasm_path = out_dir.join("pyrt.wasm");
    // NOTE: we're using ghjk here
    // if this proves troubsome, consider moving the
    // task impl inline
    // NOTE: you'll need to manually invalidate the cache
    // if you change the build-pyrt behaviour
    assert!(
        std::process::Command::new("ghjk")
            .args(["x", "build-pyrt"])
            .env("PYRT_WASM_OUT", &wasm_path)
            .env("PYRT_TARGET", &wasm_path)
            .current_dir(cwd.join("../../"))
            .spawn()
            .expect("error spawning ghjk")
            .wait()
            .expect("error building pyrt")
            .success(),
        "error building pyrt"
    );

    let engine = wasmtime::Engine::new(
        wasmtime::Config::new()
            .wasm_backtrace(true)
            // embedded wasm images have backtrace enabled
            .wasm_backtrace_details(wasmtime::WasmBacktraceDetails::Enable)
            .cache_config_load_default()
            .map_err(|err| format!("error reading system's wasmtime cache config: {err}"))?
            .target(&target)
            .map_err(|err| format!("error configuring wasmtime for target {target}: {err}"))?,
    )
    .map_err(|err| format!("error making wasmtiem engine: {err}"))?;
    // note: compilation here is extra-slow if building under the debug profile
    // since wasmtime will also be in the debug profile
    // consider upgrading the cranelift crates to opt3 if this proves
    // to be an issue.
    // At first, I was just using the wasmtime CLI for precomiplation.
    // The  cli is distrubuted in release mode and did the deed in 3 secs max.
    // The engine kept rejecting the checksum from the CLI even on the same
    // version (19.0.0).
    let comp = wasmtime::component::Component::from_file(&engine, wasm_path)
        .map_err(|err| format!("error making component from file: {err}"))?;
    let cwasm = comp
        .serialize()
        .map_err(|err| format!("error serializing component: {err}"))?;

    zstd::stream::copy_encode(
        &cwasm[..],
        std::fs::File::create(out_dir.join("pyrt.cwasm.zst"))
            .map_err(|err| format!("error creating pyrt.cwasm.zst: {err}"))?,
        if std::env::var("PROFILE")? == "release" {
            19
        } else {
            1
        },
    )
    .map_err(|err| format!("error compress writing pyrt.cwasm.zst: {err}"))?;
    // wasmtime::Component
    Ok(())
}
