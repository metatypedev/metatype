ARG CROSS_BASE_IMAGE
ARG CROSS_TARGET

FROM ghcr.io/cross-rs/$CROSS_TARGET:main
# FROM ghcr.io/cross-rs/x86_64-unknown-linux-gnu:main
# FROM $CROSS_BASE_IMAGE
# RUN cat /etc/*release && uname -a && exit 1

ARG CROSS_DEB_ARCH=

ENV ARCH=$CROSS_DEB_ARCH
RUN set -eux \
    && dpkg --add-architecture $ARCH \
    && apt-get update \
    && apt-get install --assume-yes --no-install-recommends \
                make:$ARCH \
                # libffi-sys cate build dep\
                automake:$ARCH \
                # wasmedge-sys crate build dep\
                libclang-dev:$ARCH \
                # openssl crate build deps \
                pkg-config:$ARCH \
                libssl-dev:$ARCH \
                # base ghjk deps \ 
                git:$ARCH \
                curl:$ARCH \
                # asdf deps \
                xz-utils:$ARCH \
                unzip:$ARCH

ARG GHJK_VERSION=f380522
ENV GHJK_SHARE_DIR=/ghjk
RUN curl -fsSL https://raw.github.com/metatypedev/ghjk/$GHJK_VERSION/install.sh \
   | GHJK_INSTALL_EXE_DIR=/usr/bin GHJK_INSTALL_HOOK_SHELLS=bash sh

COPY ghjk.ts .
RUN OCI=1 NO_PYTHON=1 ghjk ports sync
ENV GHJK_ENV=$GHJK_SHARE_DIR/env.sh
ENV BASH_ENV=$GHJK_ENV
# RUN echo $PATH && echo $LD_LIBRARY_PATH && dpkg --status libclang-dev && exit 1
ENV PATH=/.ghjk/envs/default/shims/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENV LD_LIBRARY_PATH=/.ghjk/envs/default/shims/lib