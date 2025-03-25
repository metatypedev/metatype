#!/usr/bin/env sh

set -eux

cargo run -p meta-cli -- gen wasm_wire

ADAPTOR="../../../../.metatype/wasi_snapshot_preview1.reactor.wasm"
[ -f "$ADAPTOR" ] || ghjk x install-wasi-adapter

TARGET=wasm32-unknown-unknown
cargo build --target $TARGET # --release
# wasm-opt --enable-bulk-memory -Oz ./target/$TARGET/release/rust.wasm -o ./target/rust-component.wasm.opt
wasm-tools component new \
  ../../../../target/$TARGET/debug/wasm_wire_rust.wasm \
  -o ../../../../target/wasm_wire_rust.wasm
  #--adapt wasi_snapshot_preview1=$ADAPTOR
# wasm-tools component wit target/rust-component.wasm

cp ../../../../target/wasm_wire_rust.wasm ../rust.wasm
