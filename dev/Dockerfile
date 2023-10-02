ARG RUST_VERSION=1.72.1
ARG DENO_VERSION=1.37.0
ARG DISTROLESS_TAG=nonroot

# must match distroless version
FROM rust:${RUST_VERSION}-slim-bullseye AS base

WORKDIR /app

RUN cargo install cargo-chef --locked

#
FROM base as plan

COPY . .

RUN cargo chef prepare --recipe-path recipe.json

# provides ARM binaries: https://github.com/LukeChannings/deno-arm64
FROM lukechannings/deno:v${DENO_VERSION} AS deno-bin

#
FROM base AS builder

ARG WASMEDGE_VERSION=0.12.1
ARG DENO_BINDGEN_URL=https://deno.land/x/deno_bindgen@0.8.1/cli.ts

ENV DENO_DIR /deno-dir/
ENV DENO_INSTALL /root/.deno
ENV PATH "${DENO_INSTALL}/bin:${PATH}"

COPY --from=deno-bin /usr/bin/deno /bin/deno

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    # base
    git \
    curl \
    python3 \
    # grpc
    protobuf-compiler \
    libprotobuf-dev \
    # openssl
    pkg-config \
    libssl-dev \
    # wasmedge
    libclang-dev \
    && rm -rf /var/lib/apt/lists/* \
    && deno install -Afq -n deno_bindgen $DENO_BINDGEN_URL \
    && curl -fsS https://raw.githubusercontent.com/WasmEdge/WasmEdge/master/utils/install.sh -o wasmedge.sh \
    && bash wasmedge.sh -v $WASMEDGE_VERSION \
    && rm wasmedge.sh

COPY --from=plan /app/recipe.json recipe.json

RUN cargo chef cook --recipe-path recipe.json --release --package native --features deno \
    && rm recipe.json

COPY . .

RUN OUT_DIR=target deno_bindgen --release -- --locked --package native --features deno \
    && mv /app/target/release/libnative.so . \
    && deno run -A dev/update.ts --cache-only --src-only \
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
    && ln -s /lib/x86_64-linux-gnu /lib/sym/amd64

#
FROM gcr.io/distroless/cc-debian11:${DISTROLESS_TAG} as prd

ARG TARGETARCH

ENV NO_COLOR true
ENV LD_LIBRARY_PATH "${LD_LIBRARY_PATH}:/nonroot/.wasmedge/lib"
ENV DENO_DIR /deno-dir/

WORKDIR /app

COPY --from=runtime-bin /tini /tini
COPY --from=runtime-bin /lib/sym /lib/sym
COPY --from=deno-bin /usr/bin/deno /bin/deno
COPY --from=builder /root/.wasmedge /nonroot/.wasmedge
COPY --from=builder /lib/*-linux-gnu/libz.so* /lib/sym/${TARGETARCH}
COPY --from=builder /app/bindings/bindings.ts ./bindings/
COPY --from=builder /app/libnative.so ./target/release/
COPY --from=builder /app/typegate/deno.json ./typegate/
COPY --from=builder /app/typegate/src ./typegate/src/
COPY dev/LICENSE-Elastic-2.0.md LICENSE.md

# writeable
COPY --from=builder --chown=nonroot:nonroot /deno-dir /deno-dir
COPY --from=builder --chown=nonroot:nonroot /app/typegate/deno.lock ./typegate/
COPY --from=builder --chown=nonroot:nonroot /app/typegate/tmp ./

USER nonroot
EXPOSE 7890

WORKDIR /app/typegate
ENTRYPOINT ["/tini", "--"]
CMD ["/bin/deno", "task", "run"]
