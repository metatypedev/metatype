#!/usr/bin/env sh

set -e

cd ..
cargo run -p meta-cli -- gen mdk wasm_wire
cd -

ADAPTOR="../../../../../../tmp/wasi_snapshot_preview1.reactor.wasm"
[ -f "$ADAPTOR" ] || ghjk x install-wasi-adapter

TARGET=wasm32-wasi
cargo build --target $TARGET # --release
# wasm-opt --enable-bulk-memory -Oz ./target/$TARGET/release/rust.wasm -o ./target/rust-component.wasm.opt
wasm-tools component new \
  ./target/$TARGET/debug/rust.wasm \
  -o ./target/rust-component.wasm \
  --adapt wasi_snapshot_preview1=$ADAPTOR
wasm-tools component wit target/rust-component.wasm

cp target/rust-component.wasm ../rust.wasm
