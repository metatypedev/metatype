// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export const CURRENT_VERSION = "0.5.1-rc.0";
export const LATEST_RELEASE_VERSION = "0.5.0";
export const LATEST_PRE_RELEASE_VERSION = null;
export const GHJK_VERSION = "v0.2.1";
export const GHJK_ACTION_VERSION = "318209a9d215f70716a4ac89dbeb9653a2deb8bc";
export const RUST_VERSION = "1.80.1";
export const DENO_VERSION = "1.46.3";
export const WASMTIME_VERSION = "25.0.2";
export const WASMTIME_PY_VERSION = "25.0.0";
export const TYPEGRAPH_VERSION = "0.0.4";
export const PRISMA_VERSION = "5.20.0";
export const SDK_PACKAGE_NAME_TS = "@typegraph/sdk";
export const PYTHON_VERSION = "3.9.19";
export const TAGLINE =
  `Declarative API development platform. Build backend components with WASM, Typescript and Python, no matter where and how your (legacy) systems are.` as string;

export const sedLockLines: Record<string, [string | RegExp, string][]> = {
  "rust-toolchain.toml": [[/(channel = ").+(")/, RUST_VERSION]],
  ".github/**/*.yml": [
    ['(  GHJK_VERSION: ").+(")', GHJK_VERSION],
    [/([\s-]+uses:\s+metatypedev\/setup-ghjk@).+()/, GHJK_ACTION_VERSION],
  ],
  "tests/**/*.snap": [
    [/(\s*static\s*MT_VERSION:\s*&str\s*=\s*").+(";)/, CURRENT_VERSION],
  ],
  "src/typegraph/python/typegraph/__init__.py": [
    ['(version = ").+(")', CURRENT_VERSION],
  ],
  "src/typegraph/core/src/global_store.rs": [
    [/(\s{4}pub static SDK_VERSION.+=\s?").*(".+;)/, CURRENT_VERSION],
  ],
  "src/typegraph/python/pyproject.toml": [['(description = ").+(")', TAGLINE]],
  "**/Cargo.toml": [
    [/^(version = ").+(")/, CURRENT_VERSION],
    ['(description = ").+(")', TAGLINE],
    [
      /([\w-]+\s*=\s*\{\s*git\s*=\s*"https:\/\/github\.com\/prisma\/prisma-engines"\s*,\s*tag\s*=\s*").+("\s*\})/,
      PRISMA_VERSION,
    ],
    [
      /(deno\s*=\s*\{\s*git\s*=\s*"https:\/\/github\.com\/metatypedev\/deno"\s*,\s*branch\s*=\s*"v).+(-embeddable"\s*\})/,
      DENO_VERSION,
    ],
    ['(wasmtime = ").+(")', WASMTIME_VERSION],
    ['(wasmtime-wasi = ").+(")', WASMTIME_VERSION],
  ],
  "src/typegraph/deno/deno.json": [
    [/(\s*"version"\s*:\s*").+(",?)/, CURRENT_VERSION],
  ],
  "tools/deps.ts": [[/(.*\/metatypedev\/ghjk\/)[^\/]*(\/.*)/, GHJK_VERSION]],
  "tools/cross.Dockerfile": [["(ARG GHJK_VERSION=).*()", GHJK_VERSION]],
  "tools/Dockerfile": [
    ["(ARG DENO_VERSION=).*()", DENO_VERSION],
    ["(ARG RUST_VERSION=).*()", RUST_VERSION],
    ["(ARG GHJK_VERSION=).*()", GHJK_VERSION],
  ],
  "src/typegate/src/runtimes/wit_wire/mod.ts": [
    [/(const\s+METATYPE_VERSION = ").*(";)/, CURRENT_VERSION],
  ],
  "src/typegate/src/typegraph/versions.ts": [
    ['(const typegraphVersion = ").*(";)', TYPEGRAPH_VERSION],
  ],
  "src/typegraph/core/src/typegraph.rs": [
    [/(static TYPEGRAPH_VERSION: &str = ").*(";)/, TYPEGRAPH_VERSION],
  ],
  "whiz.yaml": [
    ['(  TYPEGRAPH_VERSION: ").+(")', TYPEGRAPH_VERSION],
    ['(    GHJK_VERSION: ").+(")', GHJK_VERSION],
  ],
  "ghjk.ts": [
    ['(    TYPEGRAPH_VERSION: ").+(",)', TYPEGRAPH_VERSION],
  ],
  "docs/metatype.dev/docusaurus.config.js": [['(  tagline: ").+(",)', TAGLINE]],
  "**/pyproject.toml": [
    ['(version = ").+(")', CURRENT_VERSION],
    [/(wasmtime = "\^).+(")/, WASMTIME_PY_VERSION],
  ],
  "examples/templates/**/compose.yml": [
    ["(    image: ghcr.io/metatypedev/typegate:v).+()", CURRENT_VERSION],
  ],
  "examples/templates/**/pyproject.toml": [
    ['(typegraph = ").+(")', CURRENT_VERSION],
  ],
  "examples/templates/**/package.json": [
    [/(\s*"@typegraph\/sdk"\s*:\s*"\^).+(",?)/, CURRENT_VERSION],
  ],
  "examples/templates/**/*.ts": [
    [
      /(import\s+.+\s+from "jsr:@typegraph\/sdk@)[^\/]+((?:\/.+)?";)/,
      CURRENT_VERSION,
    ],
  ],
  "CONTRIBUTING.md": [[/(GHJK_VERSION=").*(")/, GHJK_VERSION]],
};
