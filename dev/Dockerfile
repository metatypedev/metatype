# disable SHELL cmd down below if switching to non-debug
ARG RUST_VERSION=1.75.0
ARG DENO_VERSION=1.41.0
ARG DISTROLESS_TAG=debug-nonroot

#
# must match distroless debian version
FROM rust:${RUST_VERSION}-slim-bullseye AS base

WORKDIR /app

RUN cargo install cargo-chef --locked

FROM base as plan

COPY . .

RUN cargo chef prepare --recipe-path recipe.json

#
FROM denoland/deno:${DENO_VERSION} AS deno-bin

#
FROM base AS builder

ENV DENO_DIR /deno-dir/
ENV DENO_INSTALL /root/.deno
ENV PATH "${DENO_INSTALL}/bin:${PATH}"

COPY --from=deno-bin /usr/bin/deno /bin/deno

RUN set -eux; \
    export DEBIAN_FRONTEND=noninteractive; \
    apt update; \
    apt install --yes --no-install-recommends \
    # typegate build \
    make \
    ## libffi-sys\
    automake \
    # wasm-opt deps \
    clang \
    ## wasmedge-sys \
    libclang-dev \
    ## openssl deps \
    pkg-config \
    libssl-dev \
    # base ghjk deps \
    git \
    curl \
    # asdf deps \
    xz-utils \
    unzip \
    ; \
    apt clean autoclean; apt autoremove --yes; rm -rf /var/lib/{apt,dpkg,cache,log}/;

ARG GHJK_VERSION=423d38
RUN GHJK_INSTALL_EXE_DIR=/usr/bin GHJK_INSTALL_HOOK_SHELLS=bash \
    deno run -A https://raw.github.com/metatypedev/ghjk/$GHJK_VERSION/install.ts

COPY ghjk.ts .
RUN OCI=1 NO_PYTHON=1 ghjk ports sync
ENV GHJK_ENV=/root/.local/share/ghjk/env.sh

ARG WASM_OPT_VERSION=0.116.0
ARG WASM_TOOLS_VERSION=1.0.53
RUN cargo install wasm-opt@$WASM_OPT_VERSION --locked --debug
RUN cargo install wasm-tools@$WASM_TOOLS_VERSION --locked --debug

COPY --from=plan /app/recipe.json recipe.json

RUN . $GHJK_ENV \
    && cargo chef cook --recipe-path recipe.json --package typegate \
    && rm recipe.json

COPY . .

RUN . $GHJK_ENV \
    && cargo build --package typegate

RUN . $GHJK_ENV \
    && deno run -A dev/update.ts --cache-only --src-only \
    && mkdir -p typegate/tmp

#
FROM builder as dev

RUN . $GHJK_ENV \
    && mv target /tmp/target \
    && rm -rf * \
    && mv /tmp/target .

#
FROM builder AS runtime-bin

ARG TINI_VERSION=v0.19.0
ARG TARGETARCH

ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini-${TARGETARCH} /tini

RUN . $GHJK_ENV \
    && chmod +x /tini \
    && mkdir -p /lib/sym \
    && ln -s /lib/aarch64-linux-gnu /lib/sym/arm64 \
    && ln -s /lib/x86_64-linux-gnu /lib/sym/amd64 \
    && cp $(dirname $(realpath $(which wasmedge)))/.. /.wasmedge -r

#
FROM gcr.io/distroless/cc-debian11:${DISTROLESS_TAG} as prd

SHELL ["/busybox/sh", "-c"]

ARG TARGETARCH

ENV NO_COLOR true
ENV DENO_DIR /deno-dir/
ENV LD_LIBRARY_PATH "${LD_LIBRARY_PATH}:/.wasmedge/lib64"

WORKDIR /app

COPY --from=runtime-bin /tini /tini
COPY --from=runtime-bin /lib/sym /lib/sym
COPY --from=runtime-bin /.wasmedge /.wasmedge
COPY --from=builder /lib/*-linux-gnu/libz.so* /lib/sym/${TARGETARCH}

COPY --from=builder /app/target/debug/typegate /bin/typegate
# the typegate ecma sources
COPY --from=builder /app/typegate/deno.jsonc /app/typegate/import_map.json ./typegate/
COPY --from=builder /app/typegate/engine/*.js /app/typegate/engine/*.ts ./typegate/engine/
COPY --from=builder /app/typegate/src ./typegate/src/
COPY --from=builder /app/typegate/tests ./typegate/tests/
COPY dev/LICENSE-Elastic-2.0.md LICENSE.md

# writeable
COPY --from=builder --chown=nonroot:nonroot /deno-dir /deno-dir
COPY --from=builder --chown=nonroot:nonroot /app/typegate/deno.lock ./typegate/
COPY --from=builder --chown=nonroot:nonroot /app/typegate/tmp ./tmp

#
# run the checks in a separate target to avoid bloating
# the final image with the deno bin
# https://forums.docker.com/t/why-run-command-which-deletes-files-inflates-image-size/33670
FROM prd as check

# distroless-nonroot is by default the nonroot user
# which prevents us from removing the /deno bin down below
USER root

# we temporarliy copy the deno bin and run the type checker
# to make sure all required ts files are found in the image
COPY --from=deno-bin --chown=nonroot:nonroot /usr/bin/deno /bin/deno
RUN /bin/deno check \
    --config /app/typegate/deno.jsonc \
    /app/typegate/src/**/*.ts \
    /app/typegate/tests/utils/**/*.ts \
    && rm /bin/deno

#
FROM prd as epoint

USER nonroot
EXPOSE 7890

ENTRYPOINT ["/tini", "--"]
CMD ["/bin/typegate"]
