#!/usr/bin/env bash

export PYTHONDONTWRITEBYTECODE=1
export PYTHONUNBUFFERED=1
export RUSTFLAGS="$RUSTFLAGS -A dead_code -A unused_variables"
# export RUST_LOG=resolvers=DEBUG 

concurrently --kill-others --names meta,gate1,nativ,docus,gate2 \
    "cargo watch -w meta-cli/src -x 'run -p meta -- -C ../examples dev'" \
    "cargo watch -C typegate --ignore native/src --ignore '*.json' --ignore migrations --ignore tests --ignore workers --shell 'TG_PORT=7891 ./run.sh'" \
    "cargo watch -w typegate/native/src --shell 'rm -rf ~/Library/Caches/deno/plug/file && OUT_DIR=$(pwd)/typegate/native deno_bindgen -- -p native'" \
    "pnpm -C website start --no-open" \
    #"cargo watch --workdir ../typegate --ignore native/src --ignore 'native/*.json' --ignore migrations --ignore tests --ignore target --ignore workers --shell 'TG_PORT=7892 ./run.sh > /dev/null'" \
