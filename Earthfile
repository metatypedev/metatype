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
  # we need deno for ghjk
  COPY +deno-bin/deno /bin/deno

  # deps required to install the ghjk tools
  RUN set -eux; \
      export DEBIAN_FRONTEND=noninteractive; \
      apt update; \
      apt install --yes --no-install-recommends \
      git \
      curl \
      xz-utils \
      unzip \
      # poetry reqs
      python3 \
      python3-setuptools \
      python3-venv \
      ;\
      apt clean autoclean; apt autoremove --yes; rm -rf /var/lib/{apt,dpkg,cache,log}/;

  RUN SHELL=bash deno run -A https://raw.github.com/metatypedev/ghjk/feat/mvp/install.ts
  COPY ghjk.ts .

  ENV GHJK_HOOK=/root/.local/share/ghjk/hooks/hook.sh
  ENV BASH_ENV=$GHJK_HOOK

  RUN bash -c '\
    ghjk sync; \
    rm ~/.local/share/ghjk/envs/.app/downloads -r;'
  # TODO: better way clean out ghjk downloads

  SAVE ARTIFACT /root/.local/share/ghjk

COPY_GHJK_DEPS:
  FUNCTION
  ENV GHJK_HOOK=/root/.local/share/ghjk/hooks/hook.sh
  ENV BASH_ENV=$GHJK_HOOK
  COPY +ghjk-deps/ghjk /root/.local/share/ghjk
  COPY ghjk.ts .

test-website:
  FROM +ghjk-deps

  COPY --dir typegraph website ruff.toml poetry.lock pyproject.toml CONTRIBUTING.md CHANGELOG.md .

  RUN bash -c '\
    python3 -m venv .venv; \
    source .venv/bin/activate; \
    poetry install --no-root; \
    cd website; \
    pnpm install --frozen-lockfile;'

  RUN bash -c '\
    source .venv/bin/activate; \
    cd website; \
    pnpm lint; \
    pnpm build;'

rust-builder:
  # must match distroless version
  FROM rust:${RUST_VERSION}-slim-bullseye
  
  ARG WASMEDGE_VERSION=0.12.1

  RUN rustup target add wasm32-unknown-unknown

  RUN set -eux; \
      export DEBIAN_FRONTEND=noninteractive; \
      apt update; \
      apt install --yes --no-install-recommends \
      # base
      git \
      curl \
      python3 \
      python3-venv \
      make \
      cmake \
      # grpc
      protobuf-compiler \
      libprotobuf-dev \
      # openssl
      pkg-config \
      libssl-dev \
      # wasmedge
      libclang-dev \
      ;\
      apt clean autoclean; apt autoremove --yes; rm -rf /var/lib/{apt,dpkg,cache,log}/; \
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

# FIXME: cargo-chef is broken in earthly :(
# https://github.com/earthly/earthly/issues/786
# but we still get to build the dependencies once
# for all the rust test targets
chef-recipe:
  FROM +rust-builder
  DO +COPY_SOURCES_RUST
  RUN cargo chef prepare --recipe-path recipe.json
  SAVE ARTIFACT recipe.json

chef-cook:
  FROM +rust-builder

  COPY +chef-recipe/recipe.json recipe.json
  RUN bash -c '\
    cargo chef cook --recipe-path recipe.json --profile $CARGO_PROFILE --package typegate; \
    rm recipe.json; '

testpre-rust:

  # FROM +chef-cook
  FROM +rust-builder

  COPY +deno-bin/deno /bin/deno

  WORKDIR /app
  DO +COPY_GHJK_DEPS

  COPY poetry.lock pyproject.toml .
  COPY --dir typegraph/python typegraph/python

  # install python deps
  RUN bash -c '\
    python3 -m venv .venv; \
    source .venv/bin/activate; \
    poetry install --no-root;'

  DO +COPY_SOURCES_RUST

  # fetch cargo deps
  RUN cargo fetch


  ENV WASM_FILE=target/debug/typegraph_core.wasm
  # generate wasm modules and their binding code
  RUN bash -c '\
    cargo build --profile $CARGO_PROFILE -p typegraph_core --target wasm32-unknown-unknown --target-dir target/wasm;\
    mkdir -p $(dirname $WASM_FILE);\
    wasm-tools component new target/wasm/wasm32-unknown-unknown/debug/typegraph_core.wasm -o $WASM_FILE;\
    rm -rf typegraph/deno/src/gen;\
    jco transpile $WASM_FILE -o typegraph/deno/src/gen;\
    deno run -A typegraph/deno/dev/fix-declarations.ts;\
    rm -rf typegraph/python/typegraph/gen;\
    poetry run python -m wasmtime.bindgen $WASM_FILE --out-dir typegraph/python/typegraph/gen; '

test-typegraph-core:
  FROM +testpre-rust

  # test in native rust, not in wasm for a future rust SDK
  # without --tests, the --doc is causing a link error "syntax error in VERSION script"
  RUN bash -c '\
    cargo test --locked --package typegraph_core --tests;'

test-meta-cli:
  FROM +testpre-rust

  RUN bash -c '\
    cargo run --profile $CARGO_PROFILE --locked --package meta-cli -- --help; \
    cargo test --locked --package meta-cli; '

test-libs:
  FROM +testpre-rust

  # from old test-libs
  RUN bash -c '\
    cargo test --locked --exclude meta-cli --exclude typegate \
      --exclude typegraph_engine --exclude typegraph_core --workspace;'

test-typegate-image:
  FROM +test-meta-cli

  RUN bash -c '\
    cargo build --profile $CARGO_PROFILE -p meta-cli; \
    cargo build --profile $CARGO_PROFILE -p xtask; ' # xtask and meta-cli are used by the test suite

  COPY --dir dev/ .

  RUN bash -c '\
    deno run -A dev/update.ts --cache-only || deno run -A dev/update.ts --cache-only;'

  ENTRYPOINT ["bash", "-c", "\
    deno run -A dev/test.ts --threads 2 -- --coverage=coverage; \
    deno --unstable coverage ./coverage --lcov > coverage.lcov; "]
  SAVE IMAGE test-typegate:latest

test-typegate:
  FROM earthly/dind:alpine-3.18-docker-23.0.6-r4
  WORKDIR /app
  COPY dev/envs .
  WITH DOCKER \
          --compose compose.base.yml \
          --compose compose.prisma.yml \
          --compose compose.s3.yml \
          --load test-typegate:latest=+test-typegate-image
      RUN docker run test-typegate:latest
  END


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
