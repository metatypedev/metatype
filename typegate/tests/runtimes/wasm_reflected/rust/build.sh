#!/usr/bin/env sh

set -eux

cargo build --target wasm32-unknown-unknown # --release
# wasm-opt -Oz ./target/wasm32-unknown-unknown/release/rust.wasm -o ./target/rust-component.wasm.opt
wasm-tools component new ./target/wasm32-unknown-unknown/debug/rust.wasm -o ./target/rust-component.wasm
# wasm-tools component wit target/rust-component.wasm

cp target/rust-component.wasm ../rust.wasm
