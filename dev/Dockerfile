# disable SHELL cmd down below if switching to non-debug
ARG RUST_VERSION=1.77.1
ARG DENO_VERSION=1.43.6
ARG DISTROLESS_TAG=debug-nonroot

#
# must match distroless debian version
FROM rust:${RUST_VERSION}-slim-bullseye AS base

WORKDIR /app

RUN cargo install cargo-chef --locked --debug

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
    ## openssl deps \
    pkg-config \
    libssl-dev \
    # base ghjk deps \
    git \
    curl \
    # asdf deps \
    zstd \
    xz-utils \
    unzip \
    ; \
    apt clean autoclean; apt autoremove --yes; rm -rf /var/lib/{apt,dpkg,cache,log}/;

ARG GHJK_VERSION=8d50518
RUN GHJK_INSTALL_EXE_DIR=/usr/bin GHJK_INSTALL_HOOK_SHELLS=bash \
    deno run -A https://raw.github.com/metatypedev/ghjk/$GHJK_VERSION/install.ts

COPY dev/*.ts dev/
COPY ghjk.ts .
ENV GHJK_ENV=oci
ENV GHJK_ACTIVATE=.ghjk/envs/$GHJK_ENV/activate.sh
RUN ghjk envs cook

COPY --from=plan /app/recipe.json recipe.json

ARG CARGO_PROFILE=release

RUN . "$GHJK_ACTIVATE" \
    && cargo chef cook --recipe-path recipe.json --profile $CARGO_PROFILE --package typegate \
    && rm recipe.json

COPY . .

RUN . "$GHJK_ACTIVATE" \
    && cargo build --profile $CARGO_PROFILE --package typegate \
    && ( \
        [ $CARGO_PROFILE = 'release' ]  \
            && cp target/release/typegate typegate-bin \
            || cp target/debug/typegate typegate-bin \
    )

RUN . "$GHJK_ACTIVATE" \
    && deno run -A dev/update.ts --cache-only --src-only \
    && mkdir -p typegate/tmp

#
FROM builder as dev

RUN . "$GHJK_ACTIVATE" \
    && mv target /tmp/target \
    && rm -rf * \
    && mv /tmp/target .

#
FROM builder AS runtime-bin

ARG TINI_VERSION=v0.19.0
ARG TARGETARCH

ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini-${TARGETARCH} /tini

RUN . "$GHJK_ACTIVATE" \
    && chmod +x /tini \
    && mkdir -p /lib/sym \
    && ln -s /lib/aarch64-linux-gnu /lib/sym/arm64 \
    && ln -s /lib/x86_64-linux-gnu /lib/sym/amd64

#
FROM gcr.io/distroless/cc-debian11:${DISTROLESS_TAG} as prd

SHELL ["/busybox/sh", "-c"]

ARG TARGETARCH

ENV NO_COLOR true
ENV DENO_DIR /deno-dir/

WORKDIR /app

COPY --from=runtime-bin /tini /tini
COPY --from=runtime-bin /lib/sym /lib/sym
COPY --from=builder /lib/*-linux-gnu/libz.so* /lib/sym/${TARGETARCH}

COPY --from=builder /app/typegate-bin /bin/typegate
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

ENV TMP_DIR=/app/tmp

ENTRYPOINT ["/tini", "--"]
CMD ["/bin/typegate"]
