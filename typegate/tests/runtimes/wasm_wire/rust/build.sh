#!/usr/bin/env sh

set -e

pushd ..
cargo run -p meta-cli -- gen mdk wasm_wire
popd
cargo build --target wasm32-unknown-unknown --release
wasm-tools component new ./target/wasm32-unknown-unknown/release/rust.wasm -o ./target/rust-component.wasm
# debug
wasm-tools component wit target/rust-component.wasm

mv target/rust-component.wasm ../rust.wasm
