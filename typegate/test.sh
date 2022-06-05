#!/bin/sh

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
