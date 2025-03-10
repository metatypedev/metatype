#!/usr/bin/env sh

set -eux

cargo build --target wasm32-unknown-unknown # --release
# wasm-opt -Oz ./target/wasm32-unknown-unknown/release/rust.wasm -o ./target/rust-component.wasm.opt
wasm-tools component new ../../../../target/wasm32-unknown-unknown/debug/wasm_reflected_rust.wasm -o ../../../../target/wasm_reflected_rust.wasm
# wasm-tools component wit target/rust-component.wasm

cp ../../../../target/wasm_reflected_rust.wasm ../rust.wasm
