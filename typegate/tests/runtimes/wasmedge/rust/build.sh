#!/usr/bin/env sh

set -e

cargo build --target wasm32-unknown-unknown
wasm-tools component new ./target/wasm32-unknown-unknown/debug/rust.wasm -o ./target/rust-opt.wasm
# debug
wasm-tools component wit target/rust-opt.wasm

mv target/rust-opt.wasm ../rust.wasm
