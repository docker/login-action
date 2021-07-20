# syntax=docker/dockerfile:1.2
ARG NODE_VERSION
ARG DOCKER_VERSION=20.10.7
ARG BUILDX_VERSION=0.6.0

FROM docker:${DOCKER_VERSION} as docker
FROM docker/buildx-bin:${BUILDX_VERSION} as buildx

FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache binutils curl git unzip
ENV GLIBC_VER=2.31-r0
RUN curl -sL "https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub" -o "/etc/apk/keys/sgerrand.rsa.pub" \
  && curl -sLO "https://github.com/sgerrand/alpine-pkg-glibc/releases/download/${GLIBC_VER}/glibc-${GLIBC_VER}.apk" \
  && curl -sLO "https://github.com/sgerrand/alpine-pkg-glibc/releases/download/${GLIBC_VER}/glibc-bin-${GLIBC_VER}.apk" \
  && apk add --no-cache \
    glibc-${GLIBC_VER}.apk \
    glibc-bin-${GLIBC_VER}.apk \
  && curl -sL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
  && unzip -qq "awscliv2.zip" \
  && ./aws/install \
  && aws --version
WORKDIR /src

FROM base AS deps
RUN --mount=type=bind,target=.,rw \
  --mount=type=cache,target=/src/node_modules \
  yarn install

FROM deps AS test
ENV RUNNER_TEMP=/tmp/github_runner
ENV RUNNER_TOOL_CACHE=/tmp/github_tool_cache
RUN --mount=type=bind,target=.,rw \
  --mount=type=cache,target=/src/node_modules \
  --mount=type=bind,from=docker,source=/usr/local/bin/docker,target=/usr/bin/docker \
  --mount=type=bind,from=buildx,source=/buildx,target=/usr/libexec/docker/cli-plugins/docker-buildx \
  yarn run test --coverageDirectory=/tmp/coverage

FROM scratch AS test-coverage
COPY --from=test /tmp/coverage /
