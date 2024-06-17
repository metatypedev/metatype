ARG CROSS_BASE_IMAGE
ARG CROSS_TARGET

# the default image passed on $CROSS_BASE_IMAGE is on ubuntu 16 which
# is EOL and has too old versions of libraries
FROM ghcr.io/cross-rs/$CROSS_TARGET:main
# FROM $CROSS_BASE_IMAGE
# RUN cat /etc/*release && uname -a && apt-mark showhold  && exit 1

ARG CROSS_DEB_ARCH=

# statically linked libraries will need to be avail
# in the target arch
ENV ARCH=$CROSS_DEB_ARCH
RUN set -eux \
   && dpkg --add-architecture $ARCH \
   && apt-get update \
   && apt install --fix-broken --assume-yes --no-install-recommends \
   make \
   clang \
   # libffi-sys cate build dep\
   automake \
   # protoc\
   libprotoc-dev:$ARCH \
   # openssl crate build deps \
   pkg-config \
   libssl-dev:$ARCH \
   zlib1g-dev \
   zlib1g-dev:$ARCH \
   # base ghjk deps \ 
   git \
   curl \
   # asdf deps \
   zstd \
   xz-utils \
   unzip

ARG GHJK_VERSION=fbd977d
ENV GHJK_SHARE_DIR=/ghjk
RUN curl -fsSL https://raw.github.com/metatypedev/ghjk/$GHJK_VERSION/install.sh \
   | GHJK_INSTALL_EXE_DIR=/usr/bin GHJK_INSTALL_HOOK_SHELLS=bash sh 

COPY ghjk.ts .
# mold breaks builds for aarch64 linux
ENV GHJK_ENV=_rust
RUN ghjk e cook
ENV BASH_ENV=$GHJK_SHARE_DIR/env.sh
# RUN echo $PATH && echo $LD_LIBRARY_PATH && dpkg --status libclang-dev && exit 1
# nasty hack until dockerfiles support setting env variables
# from command outputs: https://github.com/moby/moby/issues/29110
ENV PATH=/.ghjk/envs/$GHJK_ENV/shims/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENV LD_LIBRARY_PATH=/.ghjk/envs/$GHJK_ENV/shims/lib
