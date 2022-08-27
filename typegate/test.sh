#!/bin/sh

SCRIPT_PATH=$(dirname $(realpath -s $0))

export VIRTUAL_ENV="$SCRIPT_PATH/../typegraph/.venv"
export PATH="$SCRIPT_PATH/../typegraph/.venv/bin:$PATH"

cd ${SCRIPT_PATH} && \
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
    "${@}"
