VERSION --use-function-keyword 0.7
FROM debian:bullseye-slim
WORKDIR /app

ARG --global RUST_VERSION=1.73.0
ARG --global DISTROLESS_TAG=debug-nonroot
ARG --global TARGETARCH
ARG CARGO_PROFILE=debug
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
  COPY +ghjk-deps/root/.local/share/ghjk /root/.local/share/ghjk

test-website:
  # ARG PYTHON_VERSION=3.8
  # FROM python:$PYTHON_VERSION-slim-bullseye

  # DO +COPY_GHJK_DEPS
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
      python3 \
      make \
      cmake \
      # grpc
      protobuf-compiler \
      libprotobuf-dev \
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

build-typegate:
  FROM +rust-builder

  COPY +chef-recipe/recipe.json recipe.json
  RUN cargo chef cook --recipe-path recipe.json --profile $CARGO_PROFILE --package typegate \
    && rm recipe.json

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
