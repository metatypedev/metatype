#ARG DENO_VERSION=1.21.0
#ARG TINI_VERSION=0.19.0

FROM rust:1.60 AS builder

WORKDIR /app

RUN rustup show
RUN curl -fsSL https://deno.land/x/install/install.sh | sh

#RUN wget https://github.com/denoland/deno/archive/refs/tags/v${DENO_VERSION}.zip \
#    && unzip v${DENO_VERSION}.zip \
#    && cargo build --release --locked --manifest-path deno-${DENO_VERSION}/Cargo.toml \
#    && mv /usr/local/bin/deno

ENV DENO_INSTALL="/root/.deno"
ENV PATH="$DENO_INSTALL/bin:${PATH}"

RUN deno install -Afq -n deno_bindgen https://deno.land/x/deno_bindgen/cli.ts

COPY native ./native

WORKDIR /app/native

RUN deno_bindgen --release

#RUN wget https://github.com/krallin/tini/releases/download/v${TINI_VERSION}/tini-arm64 --output /tini \
#    && chmod +x /tini

#

FROM debian:stable-slim AS build-env

#

# FROM gcr.io/distroless/cc:latest
FROM denoland/deno:distroless-1.21.0 AS runner

#ENV DENO_VERSION=${DENO_VERSION}
#COPY --from=builder /usr/local/bin/deno /usr/local/bin/deno
#COPY --from=builder /tini /tini
#COPY --from=build-env /lib/aarch64-linux-gnu/libz.so.1 /lib/x86_64-linux-gnu/libz.so.1
COPY --from=build-env /lib/x86_64-linux-gnu/libz.so.1 /lib/x86_64-linux-gnu/libz.so.1

WORKDIR /app
#USER 1000

COPY --from=builder /app/native/bindings ./native/bindings
COPY --from=builder /app/native/target/release/libnative.so ./native/target/release/libnative.so
COPY src ./src
COPY import_map.json .
COPY .env.defaults .
COPY run.sh .

EXPOSE 8080

ENTRYPOINT ["/tini", "--"]
CMD ["./run.sh"]
