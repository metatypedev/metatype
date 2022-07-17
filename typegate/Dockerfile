ARG DENO_BINDGEN_VERSION=0.5.1
ARG RUST_VERSION=1.62.0
ARG DENO_VERSION=1.22.0

FROM rust:${RUST_VERSION} AS builder

WORKDIR /app

ARG DENO_VERSION
ARG DENO_BINDGEN_VERSION
ENV DENO_INSTALL="/root/.deno"
ENV PATH="${DENO_INSTALL}/bin:${PATH}"

RUN curl -fsSL https://deno.land/x/install/install.sh | sh -s v${DENO_VERSION}

RUN deno install -Afq -n deno_bindgen https://deno.land/x/deno_bindgen@${DENO_BINDGEN_VERSION}/cli.ts

COPY native ./native

WORKDIR /app/native

RUN cargo fetch --locked

RUN deno_bindgen --release -- --locked

#

FROM debian:stable-slim AS debian

#

FROM denoland/deno:distroless-${DENO_VERSION} AS runner

#COPY --from=build-env /lib/aarch64-linux-gnu/libz.so.1 /lib/x86_64-linux-gnu/libz.so.1
COPY --from=debian /lib/x86_64-linux-gnu/libz.so.1 /lib/x86_64-linux-gnu/libz.so.1

WORKDIR /app
#USER 1000

COPY --from=builder /app/native/bindings ./native/bindings
COPY --from=builder /app/native/target/release/libnative.so ./native/target/release/libnative.so
COPY src ./src
COPY import_map.json .
COPY .env.defaults .
COPY run.sh .

EXPOSE 7890

CMD ["./run.sh"]
