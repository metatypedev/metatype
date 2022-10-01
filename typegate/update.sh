#!/bin/sh

set -e

SCRIPT_PATH=$(dirname $(realpath -s $0))

cd ${SCRIPT_PATH} && \
    exec deno cache \
    --unstable \
    --import-map=import_map.json \
    --lock=lock.json \
    --lock-write \
    src/main.ts \
    $(find tests -path '*.ts') \
    "${@}"
