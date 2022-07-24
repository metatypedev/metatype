ARG DENO_BINDGEN_VERSION=0.5.1
ARG RUST_VERSION=1.62.0
ARG DENO_VERSION=1.22.0

FROM rust:${RUST_VERSION} AS builder

ARG DENO_VERSION
ARG DENO_BINDGEN_VERSION
ENV DENO_DIR /deno-dir/
ENV DENO_INSTALL /root/.deno
ENV PATH "${DENO_INSTALL}/bin:${PATH}"

RUN curl -fsSL https://deno.land/x/install/install.sh | sh -s v${DENO_VERSION} \
    && deno install -Afq -n deno_bindgen https://deno.land/x/deno_bindgen@${DENO_BINDGEN_VERSION}/cli.ts

WORKDIR /app
COPY import_map.json .
COPY .env.defaults .
COPY src ./src
COPY native ./native

WORKDIR /app/native
RUN deno_bindgen --release -- --locked

WORKDIR /app
RUN mkdir workers \
    && deno cache --import-map=import_map.json --lock=lock.json --lock-write --no-check src/main.ts

#

FROM debian:stable-slim AS debian

#

FROM denoland/deno:distroless-${DENO_VERSION} AS runner

ARG VERSION
ENV VERSION ${VERSION}

WORKDIR /app
USER nonroot

COPY --from=debian /lib/x86_64-linux-gnu/libz.so* /lib/x86_64-linux-gnu/
COPY --from=builder --chown=nonroot:nonroot /deno-dir /deno-dir
COPY --from=builder --chown=nonroot:nonroot /app/native/bindings ./native/bindings
COPY --from=builder --chown=nonroot:nonroot /app/native/target/release/libnative.so ./native/target/release/libnative.so
COPY --from=builder --chown=nonroot:nonroot /app/lock.json .
COPY --from=builder --chown=nonroot:nonroot /app/import_map.json .
COPY --from=builder --chown=nonroot:nonroot /app/src ./src
COPY --from=builder --chown=nonroot:nonroot /app/.env.defaults .
COPY --from=builder --chown=nonroot:nonroot /app/workers ./workers

EXPOSE 7890

ENTRYPOINT ["/tini", "--"]
CMD ["deno", "run", "--lock=lock.json", "--cached-only", "--import-map=import_map.json", "--unstable", "--allow-run=hostname", "--allow-env", "--allow-hrtime", "--allow-write", "--allow-ffi", "--allow-read", "--allow-net", "src/main.ts"]
