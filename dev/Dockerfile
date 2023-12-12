ARG RUST_VERSION=1.73.0
ARG DENO_VERSION=1.38.1
ARG DISTROLESS_TAG=debug-nonroot

# must match distroless version
FROM rust:${RUST_VERSION}-slim-bullseye AS base

WORKDIR /app

RUN cargo install cargo-chef --locked

FROM base as plan

COPY . .

RUN cargo chef prepare --recipe-path recipe.json

# provides ARM binaries: https://github.com/LukeChannings/deno-arm64
FROM lukechannings/deno:v${DENO_VERSION} AS deno-bin

FROM base AS builder

ENV DENO_DIR /deno-dir/
ENV DENO_INSTALL /root/.deno
ENV PATH "${DENO_INSTALL}/bin:${PATH}"

COPY --from=deno-bin /usr/bin/deno /bin/deno

RUN set -eux; \
    export DEBIAN_FRONTEND=noninteractive; \
    apt update; \
    apt install --yes --no-install-recommends \
        # base \
        git \
        curl \
        make \
        # openssl deps \
        pkg-config \
        libssl-dev \
        # asdf deps
        xz-utils \
        unzip \
        ; \
    apt clean autoclean; apt autoremove --yes; rm -rf /var/lib/{apt,dpkg,cache,log}/;

ARG GHJK_VERSION=b25b35
RUN GHJK_INSTALL_EXE_DIR=/usr/bin GHJK_INSTALL_HOOK_SHELLS=bash deno run -A https://raw.github.com/metatypedev/ghjk/$GHJK_VERSION/install.ts

COPY ghjk.ts .
RUN CI=1 NO_PYTHON=1 ghjk ports sync
ENV BASH_ENV=/root/.local/share/ghjk/env.sh
SHELL [ "/bin/bash", "-c"]

COPY --from=plan /app/recipe.json recipe.json

RUN cargo chef cook --recipe-path recipe.json --release --package typegate \
    && rm recipe.json

COPY . .

RUN cargo build --release --package typegate

RUN deno run -A dev/update.ts --cache-only --src-only \
    && mkdir -p typegate/tmp

#
FROM builder as dev

RUN mv target /tmp/target \
    && rm -rf * \
    && mv /tmp/target .

#
FROM builder AS runtime-bin

ARG TARGETARCH
ARG TINI_VERSION=v0.19.0

ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini-${TARGETARCH} /tini

RUN chmod +x /tini \
    && mkdir -p /lib/sym \
    && ln -s /lib/aarch64-linux-gnu /lib/sym/arm64 \
    && ln -s /lib/x86_64-linux-gnu /lib/sym/amd64 \
    && cp $(dirname $(realpath $(which wasmedge)))/.. /root/.wasmedge -r

#
FROM gcr.io/distroless/cc-debian11:${DISTROLESS_TAG} as prd

ARG TARGETARCH

ENV NO_COLOR true
ENV DENO_DIR /deno-dir/
ENV LD_LIBRARY_PATH "${LD_LIBRARY_PATH}:/nonroot/.wasmedge/lib"

WORKDIR /app

COPY --from=runtime-bin /tini /tini
COPY --from=runtime-bin /lib/sym /lib/sym
COPY --from=runtime-bin /root/.wasmedge /nonroot/.wasmedge
COPY --from=builder /lib/*-linux-gnu/libz.so* /lib/sym/${TARGETARCH}

COPY --from=builder /app/target/release/typegate /bin/typegate
# the typegate ecma sources 
COPY --from=builder /app/typegate/deno.jsonc /app/typegate/import_map.json ./typegate/
COPY --from=builder /app/typegate/engine/*.js /app/typegate/engine/*.ts ./typegate/engine/
COPY --from=builder /app/typegate/src ./typegate/src/
COPY dev/LICENSE-Elastic-2.0.md LICENSE.md

# writeable
COPY --from=builder --chown=nonroot:nonroot /deno-dir /deno-dir
COPY --from=builder --chown=nonroot:nonroot /app/typegate/deno.lock ./typegate/
COPY --from=builder --chown=nonroot:nonroot /app/typegate/tmp ./

USER nonroot
EXPOSE 7890

ENTRYPOINT ["/tini", "--"]
CMD ["/bin/typegate"]
