#!/bin/bash

SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
ABSOLUTE_SCRIPT_PATH=$(realpath $SCRIPT_DIR)

# start gRPC mock server
docker run \
    --name grpc-runtime-test \
    -p 4770:4770 \
    -p 4771:4771 \
    -v "$ABSOLUTE_SCRIPT_PATH/proto":/proto \
    -v "$ABSOLUTE_SCRIPT_PATH/stub":/stub \
		tkpd/gripmock \
    --stub=/stub \
		/proto/helloworld.proto \
		/proto/maths.proto \
		/proto/geography.proto
