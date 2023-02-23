#!/bin/sh

set -e

SCRIPT_PATH=$(dirname $(realpath -s $0))

# remember to also update dev/Dockerfile
cd ${SCRIPT_PATH} && \
    exec deno run \
    --unstable \
    --allow-run=hostname \
    --allow-env \
    --allow-hrtime \
    --allow-write \
    --allow-ffi \
    --allow-read \
    --allow-net \
    src/main.ts
