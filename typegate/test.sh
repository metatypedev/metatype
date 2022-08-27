#!/bin/sh

export VIRTUAL_ENV="$PWD/../typegraph/.venv"
export PATH="$PWD/../typegraph/.venv/bin:$PATH"

deno test \
    --import-map=import_map.json \
    --unstable \
    --allow-run \
    --allow-env \
    --allow-hrtime \
    --allow-write \
    --allow-ffi \
    --allow-read \
    --allow-net \
    "$@"
