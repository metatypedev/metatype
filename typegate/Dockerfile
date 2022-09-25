ARG RUST_VERSION
ARG DENO_VERSION

FROM rust:${RUST_VERSION} AS builder

ARG DENO_VERSION
ARG DENO_BINDGEN_URL
ENV DENO_DIR /deno-dir/
ENV DENO_INSTALL /root/.deno
ENV PATH "${DENO_INSTALL}/bin:${PATH}"

RUN curl -fsSL https://deno.land/x/install/install.sh | sh -s v${DENO_VERSION} \
    && deno install -Afq -n deno_bindgen $DENO_BINDGEN_URL

COPY . .

RUN deno_bindgen --release -- --locked --package native

WORKDIR /typegate

RUN deno cache --unstable --import-map=import_map.json --lock=lock.json --lock-write src/main.ts

#

FROM debian:stable-slim AS debian

#

FROM denoland/deno:distroless-${DENO_VERSION} AS runner

WORKDIR /app
USER nonroot

COPY --from=debian /lib/x86_64-linux-gnu/libz.so* /lib/x86_64-linux-gnu/
COPY --from=builder /bindings/bindings.ts /bindings/
COPY --from=builder /target/release/libnative.so /target/release/
COPY --from=builder /typegate/import_map.json /typegate/.env.defaults /typegate/lock.json ./
COPY --from=builder /typegate/src ./src

# writeable
COPY --from=builder --chown=nonroot:nonroot /deno-dir /deno-dir

EXPOSE 7890

ENTRYPOINT ["/tini", "--"]
# --lock=lock.json
CMD ["deno", "run", "--import-map=import_map.json", "--unstable", "--allow-run=hostname", "--allow-env", "--allow-hrtime", "--allow-write", "--allow-ffi", "--allow-read", "--allow-net", "src/main.ts"]
