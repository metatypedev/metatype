ARG RUST_VERSION=1.70.0
ARG DENO_VERSION=1.35.1
ARG DISTROLESS_TAG=nonroot

FROM rust:${RUST_VERSION} AS base

WORKDIR /app

RUN cargo install cargo-chef --locked

# 

FROM base as plan

COPY . .

RUN cargo chef prepare --recipe-path recipe.json

#

FROM denoland/deno:bin-${DENO_VERSION} AS deno-bin

#

FROM base AS builder

ARG DENO_BINDGEN_URL=https://deno.land/x/deno_bindgen@0.8.1/cli.ts

ENV DENO_DIR /deno-dir/
ENV DENO_INSTALL /root/.deno
ENV PATH "${DENO_INSTALL}/bin:${PATH}"
ENV OUT_DIR target

COPY --from=deno-bin /deno /bin/deno

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    # grpc
    protobuf-compiler \
    libprotobuf-dev \
    # wasmedge
    libclang-dev \
    && rm -rf /var/lib/apt/lists/* \
    && deno install -Afq -n deno_bindgen $DENO_BINDGEN_URL

COPY --from=plan /app/recipe.json recipe.json

RUN cargo chef cook --recipe-path recipe.json --release --package native --features deno

COPY . .

RUN deno_bindgen --release -- --locked --package native --features deno \
    && mv /app/target/release/libnative.so .

WORKDIR /app/typegate

RUN deno cache --unstable src/main.ts \
    && mkdir -p tmp

#

FROM debian:stable-slim AS debian

ARG TINI_VERSION=v0.19.0

ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini

RUN chmod +x /tini

#

FROM gcr.io/distroless/cc-debian11:${DISTROLESS_TAG}

ENV NO_COLOR true
ENV DENO_DIR /deno-dir/
ENV LD_LIBRARY_PATH /nonroot/.wasmedge/lib

WORKDIR /app

COPY --from=builder /root/.wasmedge /nonroot/.wasmedge
COPY --from=debian /tini /tini
COPY --from=deno-bin /deno /bin/deno
COPY --from=debian /lib/x86_64-linux-gnu/libz.so* /lib/x86_64-linux-gnu/
COPY dev/LICENSE-Elastic-2.0.md LICENSE.md
COPY --from=builder /app/bindings/bindings.ts ./bindings/
COPY --from=builder /app/libnative.so ./target/release/
COPY --from=builder /app/typegate/deno.json ./typegate/
COPY --from=builder /app/typegate/src ./typegate/src/

# writeable
COPY --from=builder --chown=nonroot:nonroot /deno-dir /deno-dir
COPY --from=builder --chown=nonroot:nonroot /app/typegate/deno.lock ./typegate/
COPY --from=builder --chown=nonroot:nonroot /app/typegate/tmp ./

USER nonroot
EXPOSE 7890

WORKDIR /app/typegate
ENTRYPOINT ["/tini", "--"]
CMD ["/bin/deno", "task", "run"]
