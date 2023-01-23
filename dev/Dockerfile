ARG RUST_VERSION=1.66.0
ARG DENO_VERSION=1.29.4

FROM lukemathwalker/cargo-chef:latest-rust-${RUST_VERSION} AS base

WORKDIR /

# 

FROM base as plan

COPY . .
RUN rm -rf meta-cli \
    && cargo new meta-cli \
    && cargo chef prepare --recipe-path recipe.json

#

FROM base AS builder

ARG DENO_VERSION=1.29.4
ARG DENO_BINDGEN_URL=https://github.com/denoland/deno_bindgen/raw/main/cli.ts

ENV DENO_DIR /deno-dir/
ENV DENO_INSTALL /root/.deno
ENV PATH "${DENO_INSTALL}/bin:${PATH}"

RUN apt-get update \
    && apt-get install -y \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://deno.land/x/install/install.sh -o install.sh \
    && sh ./install.sh v${DENO_VERSION} \
    && deno install -Afq -n deno_bindgen $DENO_BINDGEN_URL

COPY --from=plan /recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

COPY . .
RUN OUT_DIR=target deno_bindgen --release -- --locked --package native -F deno \
    && mv /target/release/libnative.so .

WORKDIR /typegate
RUN deno cache --config=deno.json --unstable src/main.ts

#

FROM debian:stable-slim AS debian

#

FROM denoland/deno:distroless-${DENO_VERSION} AS runner

WORKDIR /app

COPY --from=debian /lib/x86_64-linux-gnu/libz.so* /lib/x86_64-linux-gnu/
COPY LICENSE.md .
COPY --from=builder /bindings/bindings.ts /bindings/
COPY --from=builder /libnative.so /target/release/
COPY --from=builder /typegate/deno_import.json /typegate/deno.json ./
COPY --from=builder /typegate/src ./src

# writeable
COPY --from=builder --chown=nonroot:nonroot /deno-dir /deno-dir
COPY --from=builder --chown=nonroot:nonroot /typegate/deno.lock ./

USER nonroot
EXPOSE 7890

ENTRYPOINT ["/tini", "--"]

CMD ["deno", "run", "--config=deno.json", "--unstable", "--allow-run=hostname", "--allow-env", "--allow-hrtime", "--allow-write", "--allow-ffi", "--allow-read", "--allow-net", "src/main.ts"]
