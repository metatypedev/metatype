VERSION --use-function-keyword 0.7
FROM debian:bullseye-slim
WORKDIR /app

ARG --global RUST_VERSION=1.73.0
ARG --global DISTROLESS_TAG=debug-nonroot
ARG --global TARGETARCH
ARG --global CARGO_PROFILE=dev
ENV DENO_DIR /deno-dir/

COPY_SOURCES_RUST:
  FUNCTION
  COPY Cargo.toml Cargo.lock  .
  COPY --dir libs/ meta-cli/ typegate/ typegraph/ .

deno-bin:
  ARG DENO_VERSION=1.38.1
  # provides ARM binaries: https://github.com/LukeChannings/deno-arm64
  FROM lukechannings/deno:v${DENO_VERSION}
  SAVE ARTIFACT /usr/bin/deno

ghjk-deps:
  COPY +deno-bin/deno /bin/deno

  RUN set -eux; \
      export DEBIAN_FRONTEND=noninteractive; \
      apt update; \
      apt install --yes \
      git curl xz-utils unzip \
      # poetry reqs
      python3 python3-setuptools python3-venv \
      ;\
      apt clean autoclean; apt autoremove --yes; rm -rf /var/lib/{apt,dpkg,cache,log}/;

  RUN SHELL=bash deno run -A https://raw.github.com/metatypedev/ghjk/feat/mvp/install.ts
  COPY ghjk.ts .
  RUN bash -c 'source ~/.local/share/ghjk/hooks/hook.sh; \
    init_ghjk; \
    ghjk sync; \
    rm ~/.local/share/ghjk/envs/.app/downloads -r;'
  # TODO: better way clean out ghjk downloads

  SAVE ARTIFACT /root/.local/share/ghjk

COPY_GHJK_DEPS:
  FUNCTION
  COPY +ghjk-deps/ghjk /root/.local/share/ghjk

test-website:
  FROM +ghjk-deps

  COPY --dir typegraph website ruff.toml poetry.lock pyproject.toml CONTRIBUTING.md CHANGELOG.md .

  RUN bash -c 'source ~/.local/share/ghjk/hooks/hook.sh; \
    init_ghjk; \
    python3 -m venv .venv; \
    source .venv/bin/activate; \
    poetry install --no-root; \
    cd website; \
    pnpm install --frozen-lockfile;'

  RUN bash -c 'source ~/.local/share/ghjk/hooks/hook.sh; \
    init_ghjk; \
    source .venv/bin/activate; \
    cd website; \
    pnpm lint; \
    pnpm build;'

rust-builder:
  # must match distroless version
  FROM rust:${RUST_VERSION}-slim-bullseye
  
  ARG WASMEDGE_VERSION=0.12.1

  RUN apt-get update; \
      apt-get install -y --no-install-recommends \
      # base
      git \
      curl \
      python3 python3-venv \
      make \
      cmake \
      # openssl
      pkg-config \
      libssl-dev \
      # wasmedge
      libclang-dev; \
      rm -rf /var/lib/apt/lists/*; \
      curl -fsS \
        https://raw.githubusercontent.com/WasmEdge/WasmEdge/master/utils/install.sh -o wasmedge.sh; \
      bash wasmedge.sh -v $WASMEDGE_VERSION; \
      rm wasmedge.sh; \
      curl -L --proto '=https' --tlsv1.2 -sSf \
          https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh \
          | bash; \
      cargo binstall cargo-chef -y;

  SAVE ARTIFACT /root/.wasmedge
  SAVE ARTIFACT /lib/*-linux-gnu/libz.so* 

chef-recipe:
  FROM +rust-builder
  DO +COPY_SOURCES_RUST
  RUN cargo chef prepare --recipe-path recipe.json
  SAVE ARTIFACT recipe.json

chef-cook:
  FROM +rust-builder

  DO +COPY_GHJK_DEPS

  COPY +chef-recipe/recipe.json recipe.json
  RUN cargo chef cook --recipe-path recipe.json --profile $CARGO_PROFILE --package typegate \
    && rm recipe.json

test-full:
  ENV WASM_FILE=target/debug/typegraph_core.wasm

  FROM +chef-cook

  # install python deps
  RUN bash -c 'source ~/.local/share/ghjk/hooks/hook.sh; \
    init_ghjk; \
    python3 -m venv .venv; \
    source .venv/bin/activate; \
    poetry install --no-root;'

  DO +COPY_SOURCES_RUST

  # generate wasm modules and their binding code
  RUN bash -c 'source ~/.local/share/ghjk/hooks/hook.sh; \
    init_ghjk; \
    cargo build -p typegraph_core --target wasm32-unknown-unknown --target-dir target/wasm;\
    mkdir -p $(dirname $WASM_FILE);\
    wasm-tools component new target/wasm/wasm32-unknown-unknown/debug/typegraph_core.wasm -o $WASM_FILE;\
    rm -rf typegraph/deno/src/gen;\
    jco transpile $WASM_FILE -o typegraph/deno/src/gen;\
    deno run -A typegraph/deno/dev/fix-declarations.ts;\
    rm -rf typegraph/python/typegraph/gen;\
    poetry run python -m wasmtime.bindgen $WASM_FILE --out-dir typegraph/python/typegraph/gen; '


  # from old test-typegraph-core
  # test in native rust, not in wasm for a future rust SDK
  # without --tests, the --doc is causing a link error "syntax error in VERSION script"
  RUN bash -c 'source ~/.local/share/ghjk/hooks/hook.sh; \
    init_ghjk; \
    cargo test --locked --package typegraph_core --tests;'

  # from old test-meta-cli
  RUN bash -c 'source ~/.local/share/ghjk/hooks/hook.sh; \
    init_ghjk; \
    cargo run --locked --package meta-cli -- --help; \
    cargo test --locked --package meta-cli; '

  # from old test-libs
  RUN bash -c 'source ~/.local/share/ghjk/hooks/hook.sh; \
    init_ghjk; \
    cargo test --locked --exclude meta-cli --exclude typegate \
      --exclude typegraph_engine --exclude typegraph_core --workspace;'

  RUN bash -c 'source ~/.local/share/ghjk/hooks/hook.sh; \
    init_ghjk; \
    cargo build -p meta-cli; \
    cargo build -p xtask; ' # xtask and meta-cli are used by the test suite

  COPY --dir dev/ .

  RUN bash -c 'source ~/.local/share/ghjk/hooks/hook.sh; \
    init_ghjk; \
    deno run -A dev/update.ts --cache-only || deno run -A dev/update.ts --cache-only;'

  RUN bash -c 'source ~/.local/share/ghjk/hooks/hook.sh; \
    init_ghjk; \
    deno run -A dev/test.ts --threads 2 -- --coverage=coverage; \
    deno --unstable coverage ./coverage --lcov > coverage.lcov; '

build-typegate:
  FROM +chef-cook

  DO +COPY_SOURCES_RUST
  RUN cargo build --profile $CARGO_PROFILE --package typegate

  COPY +deno-bin/deno /bin/deno
  COPY --dir dev/ .
  RUN deno run -A dev/update.ts --cache-only --src-only && mkdir -p typegate/tmp

  SAVE ARTIFACT target/$CARGO_PROFILE/typegate
  SAVE ARTIFACT typegate/deno.lock
  SAVE ARTIFACT typegate/tmp
  # NOTE: this must match with DENO_DIR
  SAVE ARTIFACT /deno-dir/

tini:
  FROM +rust-builder
  ARG TINI_VERSION=v0.19.0

  RUN curl -fsS \
    https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini-${TARGETARCH} \
    -o /tini; \
    chmod +x /tini; \
    mkdir -p /lib/sym; \
    ln -s /lib/aarch64-linux-gnu /lib/sym/arm64; \
    ln -s /lib/x86_64-linux-gnu /lib/sym/amd64;

  SAVE ARTIFACT /tini
  SAVE ARTIFACT /lib/sym

img-typegate:
  FROM gcr.io/distroless/cc-debian11:${DISTROLESS_TAG}

  ENV NO_COLOR true

  COPY +tini/tini /tini
  COPY +tini/sym /lib/sym

  COPY +build-typegate/root/.wasmedge /nonroot/.wasmedge
  COPY +build-typegate/lib/*-linux-gnu/libz.so* /lib/sym/${TARGETARCH}
  COPY +build-typegate/target/$CARGO_PROFILE/typegate /bin/typegate

  # the typegate ecma sources 
  COPY typegate/deno.jsonc typegate/import_map.json ./typegate/
  COPY typegate/engine/*.js typegate/engine/*.ts ./typegate/engine/
  COPY typegate/src ./typegate/src/
  COPY dev/LICENSE-Elastic-2.0.md LICENSE.md

  USER nonroot

  COPY +build-typegate/${DENO_DIR} ${DENO_DIR}
  COPY +build-typegate/typegate/deno.lock ./typegate
  COPY +build-typegate/typegate/tmp ./

  EXPOSE 7890

  ENTRYPOINT ["/tini", "--"]
  CMD ["/bin/typegate"]

  SAVE IMAGE typegate:latest
