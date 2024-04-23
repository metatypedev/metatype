// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    shadow_rs::new()?;

    // build and compress the `pyrt_wit_wire` wasm compress
    // into OUT_DIR/pyrt.cwasm.zst

    let cwd = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR")?);
    let pyrt_path = cwd.join("../../libs/pyrt_wit_wire/");
    let out_dir = PathBuf::from(std::env::var("OUT_DIR")?);
    let target = std::env::var("TARGET")?;

    println!(
        "cargo:rerun-if-changed={}/main.py",
        pyrt_path.to_string_lossy()
    );
    println!("cargo:rerun-if-changed={}/wit", pyrt_path.to_string_lossy());

    let wasm_path = out_dir.join("pyrt.wasm");
    // note: we're using ghjk here
    // if this proves troubsome, consider moving the
    // task impl inline
    assert!(
        std::process::Command::new("ghjk")
            .args(["x", "build-pyrt", "--target"])
            .env("PYRT_WASM_OUT", &wasm_path)
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
    let comp = wasmtime::component::Component::from_file(&engine, wasm_path)?;
    let cwasm = comp.serialize().unwrap();

    zstd::stream::copy_encode(
        &cwasm[..],
        std::fs::File::create(out_dir.join("pyrt.cwasm.zst")).unwrap(),
        if std::env::var("PROFILE")? == "release" {
            19
        } else {
            0
        },
    )?;
    // wasmtime::Component
    Ok(())
}
