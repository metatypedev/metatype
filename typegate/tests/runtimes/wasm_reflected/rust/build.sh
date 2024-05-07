#!/usr/bin/env sh

set -e

cargo build --target wasm32-unknown-unknown --release
wasm-opt -Oz ./target/wasm32-unknown-unknown/release/rust.wasm -o ./target/rust-component.wasm.opt
wasm-tools component new ./target/rust-component.wasm.opt -o ./target/rust-component.wasm
# debug
wasm-tools component wit target/rust-component.wasm

mv target/rust-component.wasm ../rust.wasm
