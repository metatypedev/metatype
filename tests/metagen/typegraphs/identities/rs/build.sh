#!/usr/bin/env sh

set -eux

ADAPTOR="../../../../../.metatype/wasi_snapshot_preview1.reactor.wasm"
[ -f "$ADAPTOR" ] || ghjk x install-wasi-adapter

TARGET=wasm32-wasip1
cargo build --target $TARGET # --release
# wasm-opt --enable-bulk-memory -Oz ./target/$TARGET/release/rust.wasm -o ./target/rust-component.wasm.opt
wasm-tools component new \
  ../../../../../target/$TARGET/debug/identities_fdk.wasm \
  -o ../../../../../target/identities_fdk.wasm \
  --adapt wasi_snapshot_preview1=$ADAPTOR
# wasm-tools component wit target/rust-component.wasm

cp ../../../../../target/identities_fdk.wasm ../rust.wasm
