#!/bin/sh

set -e

read_gitlabci() {
    grep $1 .gitlab-ci.yml | head -n 1 | cut -d : -f 2- | xargs
}

exec docker build \
    -t ${1:-typegate} \
    -f typegate/Dockerfile \
    --platform linux/amd64 \
    --progress plain \
    --build-arg DENO_VERSION="$(read_gitlabci DENO_VERSION)" \
    --build-arg DENO_BINDGEN_URL="$(read_gitlabci DENO_BINDGEN_URL)" \
    --build-arg RUST_VERSION="$(read_gitlabci RUST_VERSION)" \
    .
