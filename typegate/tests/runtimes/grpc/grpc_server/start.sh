#!/bin/bash

SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")

docker pull tkpd/gripmock

# start gRPC mock server
docker run \
    --name grpc-runtime-test \
    -p 4770:4770 \
    -p 4771:4771 \
    -v "$SCRIPT_DIR/proto":/proto \
    -v "$SCRIPT_DIR/stub":/stub tkpd/gripmock \
    --stub=/stub /proto/simple.proto
