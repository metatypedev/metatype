ARG RUST_VERSION=1.67.1
ARG DENO_VERSION=1.30.3
ARG DISTROLESS_TAG=nonroot

FROM lukemathwalker/cargo-chef:latest-rust-${RUST_VERSION} AS base

WORKDIR /app

# 

FROM base as plan

COPY . .

RUN cargo chef prepare --recipe-path recipe.json

#

FROM denoland/deno:bin-${DENO_VERSION} AS deno-bin

#

FROM base AS builder

ARG DENO_BINDGEN_URL=https://github.com/denoland/deno_bindgen/raw/main/cli.ts

ENV DENO_DIR /deno-dir/
ENV DENO_INSTALL /root/.deno
ENV PATH "${DENO_INSTALL}/bin:${PATH}"
ENV OUT_DIR target

COPY --from=deno-bin /deno /bin/deno

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    protobuf-compiler \
    libprotobuf-dev \
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

ENV DENO_DIR /deno-dir/

WORKDIR /app

COPY --from=debian /tini /tini
COPY --from=deno-bin /deno /bin/deno
COPY --from=debian /lib/x86_64-linux-gnu/libz.so* /lib/x86_64-linux-gnu/
COPY LICENSE.md .
COPY --from=builder /app/bindings/bindings.ts /bindings/
COPY --from=builder /app/libnative.so /target/release/
COPY --from=builder /app/typegate/deno.json ./
COPY --from=builder /app/typegate/src ./src

# writeable
COPY --from=builder --chown=nonroot:nonroot /deno-dir /deno-dir
COPY --from=builder --chown=nonroot:nonroot /app/typegate/deno.lock ./
COPY --from=builder --chown=nonroot:nonroot /app/typegate/tmp ./

USER nonroot
EXPOSE 7890

ENTRYPOINT ["/tini", "--", "/bin/deno"]
CMD ["run", "--unstable", "--allow-run=hostname", "--allow-env", "--allow-hrtime", "--allow-write", "--allow-ffi", "--allow-read", "--allow-net", "src/main.ts"]
