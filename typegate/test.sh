#!/bin/sh

set -e
SCRIPT_PATH=$(dirname $(realpath -s $0))

export VIRTUAL_ENV="$SCRIPT_PATH/../typegraph/.venv"
export PATH="$SCRIPT_PATH/../typegraph/.venv/bin:$PATH"
export TEST_ENV=1

cd ${SCRIPT_PATH} && \
    deno test \
    --config=deno.json \
    --unstable \
    --allow-run \
    --allow-env \
    --allow-hrtime \
    --allow-write \
    --allow-ffi \
    --allow-read \
    --allow-net \
    "${@}"
