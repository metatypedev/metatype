ARG RUST_VERSION
ARG DENO_VERSION

FROM rust:${RUST_VERSION} AS builder

WORKDIR /

ARG DENO_VERSION
ARG DENO_BINDGEN_URL
ENV DENO_DIR /deno-dir/
ENV DENO_INSTALL /root/.deno
ENV PATH "${DENO_INSTALL}/bin:${PATH}"

RUN curl -fsSL https://deno.land/x/install/install.sh -o install.sh \
    && sh ./install.sh v${DENO_VERSION} \
    && deno install -Afq -n deno_bindgen $DENO_BINDGEN_URL

COPY . .

RUN deno_bindgen --release -- --locked --package native

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
COPY --from=builder /target/release/libnative.so /target/release/
COPY --from=builder /typegate/import_map.json /typegate/.env.defaults /typegate/deno.json ./
COPY --from=builder /typegate/src ./src

# writeable
COPY --from=builder --chown=nonroot:nonroot /deno-dir /deno-dir
COPY --from=builder --chown=nonroot:nonroot /typegate/deno.lock ./

USER nonroot
EXPOSE 7890

ENTRYPOINT ["/tini", "--"]

CMD ["deno", "run", "--config=deno.json", "--unstable", "--allow-run=hostname", "--allow-env", "--allow-hrtime", "--allow-write", "--allow-ffi", "--allow-read", "--allow-net", "src/main.ts"]
