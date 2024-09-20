set -eux

cd ../../
META_CMD="cargo run -p meta-cli --"
$META_CMD -C metagen/ gen metagen_rs
cd -

ADAPTOR="../../../../.metatype/wasi_snapshot_preview1.reactor.wasm"
[ -f "$ADAPTOR" ] || ghjk x install-wasi-adapter

TARGET=wasm32-wasi
CRATE_NAME=metagen_rs_fdk
cargo build -p $CRATE_NAME --target $TARGET # --release
# wasm-opt --enable-bulk-memory -Oz ./target/$TARGET/release/rust.wasm -o ./target/rust-component.wasm.opt
wasm-tools component new \
  ../target/$TARGET/debug/$CRATE_NAME.wasm \
  -o ../target/rust-component.wasm \
  --adapt wasi_snapshot_preview1=$ADAPTOR
# wasm-tools component wit ../target/rust-component.wasm

cp ../target/rust-component.wasm ../rust.wasm
