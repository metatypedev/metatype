set -eux

# https://github.com/protocolbuffers/protobuf/issues/13346

# must be in sync with substantial/Cargo.toml protobuf
cargo install protobuf-codegen
protoc -I . --rust_out=src/protocol protocol/*
