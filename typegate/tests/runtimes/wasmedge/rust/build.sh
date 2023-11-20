#!/usr/bin/env sh

set -e

rustup target add wasm32-wasi
cargo build --target wasm32-wasi --target-dir target/wasi --release
mv target/wasm32-wasi/release/rust.wasm ..
