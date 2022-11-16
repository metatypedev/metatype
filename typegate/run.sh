#!/bin/sh

set -e

SCRIPT_PATH=$(dirname $(realpath -s $0))

cd ${SCRIPT_PATH} && \
    exec deno run \
    --config=deno.json \
    --unstable \
    --allow-run=hostname \
    --allow-env \
    --allow-hrtime \
    --allow-write \
    --allow-ffi \
    --allow-read \
    --allow-net \
    src/main.ts
