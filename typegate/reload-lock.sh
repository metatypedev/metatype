#!/bin/sh

set -e

SCRIPT_PATH=$(dirname $(realpath -s $0))

cd ${SCRIPT_PATH} && \
    exec deno cache \
    --config=deno.json \
    --unstable \
    --reload \
    --lock-write \
    $(find . -path '*.ts') && \
    ./test.sh --quiet
