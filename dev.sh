#!/usr/bin/env bash

export PYTHONDONTWRITEBYTECODE=1
export PYTHONUNBUFFERED=1
export RUSTFLAGS="$RUSTFLAGS -A dead_code -A unused_variables"
export RUST_LOG=resolvers=DEBUG

concurrently --kill-others --names graph,ntgra,gate1,ntgat,docus,gate2 \
    "cargo watch --workdir example --ignore example --watch ../typegraph --ignore 'native' --shell 'poetry run tg dev'" \
    "cargo watch --workdir typegraph/native --shell 'VIRTUAL_ENV="../.venv" maturin develop'" \
    "cargo watch --workdir typegate --ignore native/src --ignore '*.json' --ignore migrations --ignore tests --ignore target --ignore workers --shell 'TG_PORT=7891 ./run.sh'" \
    "cargo watch --workdir typegate/native --ignore '*.ts' --ignore '*.json' --shell 'rm -rf ~/Library/Caches/deno/plug/file && deno_bindgen'" \
    "pnpm -C website start" \
    #"cargo watch --workdir ../typegate --ignore native/src --ignore 'native/*.json' --ignore migrations --ignore tests --ignore target --ignore workers --shell 'TG_PORT=7892 ./run.sh > /dev/null'" \
