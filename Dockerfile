FROM ghcr.io/metatypedev/typegate:latest as builder
FROM ghcr.io/metatypedev/typegate:latest

USER root

COPY --from=builder --chown=nonroot:nonroot /app ./

USER nonroot
