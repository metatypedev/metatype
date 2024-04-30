#!/usr/bin/env sh

set -e

cargo build --target wasm32-unknown-unknown
wasm-tools component new ./target/wasm32-unknown-unknown/debug/rust.wasm -o ./target/rust-component.wasm
# debug
wasm-tools component wit target/rust-component.wasm

mv target/rust-component.wasm ../rust.wasm
