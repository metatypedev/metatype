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
    // note: we're using ghjk here
    // if this proves troubsome, consider moving the
    // task impl inline
    assert!(
        std::process::Command::new("ghjk")
            .args(["x", "build-pyrt"])
            .env("PYRT_WASM_OUT", &wasm_path)
            .env("PYRT_TARGET", &wasm_path)
            .current_dir(cwd.join("../../"))
            .output()?
            .status
            .success(),
        "error building pyrt"
    );

    let engine = wasmtime::Engine::new(
        wasmtime::Config::new()
            .cache_config_load_default()
            .map_err(|err| format!("error reading system's wasmtime cache config: {err}"))?
            .target(&target)
            .map_err(|err| format!("error configuring wasmtime for target {target}: {err}"))?,
    )?;
    // note: compilation here is extra-slow if building under the debug profile
    // since wasmtime will also be in the debug profile
    // consider upgrading the cranelift crates to opt3 if this proves
    // to be an issue.
    // At first, I was just using the wasmtime CLI for precomiplation.
    // The  cli is distrubuted in release mode and did the deed in 3 secs max.
    // The engine kept rejecting the checksum from the CLI even on the same
    // version (19.0.0).
    let comp = wasmtime::component::Component::from_file(&engine, wasm_path)?;
    let cwasm = comp.serialize().unwrap();

    zstd::stream::copy_encode(
        &cwasm[..],
        std::fs::File::create(out_dir.join("pyrt.cwasm.zst")).unwrap(),
        if std::env::var("PROFILE")? == "release" {
            19
        } else {
            1
        },
    )?;
    // wasmtime::Component
    Ok(())
}
