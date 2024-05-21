#!/usr/bin/env sh

set -e

pushd ..
cargo run -p meta-cli -- gen mdk wasm_wire
popd
cargo build --target wasm32-unknown-unknown # --release
# wasm-opt -Oz ./target/wasm32-unknown-unknown/release/rust.wasm -o ./target/rust-component.wasm.opt
wasm-tools component new ./target/wasm32-unknown-unknown/debug/rust.wasm -o ./target/rust-component.wasm
# debug
wasm-tools component wit target/rust-component.wasm

cp target/rust-component.wasm ../rust.wasm
