// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export const GHJK_VERSION = "ad7c8ba";
export const GHJK_ACTION_VERSION = "318209a9d215f70716a4ac89dbeb9653a2deb8bc";
export const RUST_VERSION = "1.77.1";
export const DENO_VERSION = "1.43.6";
export const WASMTIME_VERSION = "21.0.0";
export const WASMTIME_PY_VERSION = "21.0.0";
export const TYPEGRAPH_VERSION = "0.0.3";
export const PRISMA_VERSION = "5.6.0";
export const METATYPE_VERSION = "0.4.3-0";
export const PUBLISHED_VERSION = "0.4.2";
export const TAGLINE =
  `Declarative API development platform. Build backend components with WASM, Typescript and Python, no matter where and how your (legacy) systems are.`;

export const sedLockLines: Record<string, [string | RegExp, string][]> = {
  "rust-toolchain.toml": [
    [/(channel = ").+(")/, RUST_VERSION],
  ],
  ".github/**/*.yml": [
    ['(  GHJK_VERSION: ").+(")', GHJK_VERSION],
    [
      '(  DENO_VERSION: ").+(")',
      DENO_VERSION,
    ],
    [/([\s-]+uses:\s+metatypedev\/setup-ghjk@).+()/, GHJK_ACTION_VERSION],
  ],
  "meta-lsp/package.json": [
    [
      /(\s*"version"\s*:\s*").+(",?)/,
      METATYPE_VERSION,
    ],
  ],
  "meta-lsp/ts-language-server/package.json": [
    [
      /(\s*"version"\s*:\s*").+(",?)/,
      METATYPE_VERSION,
    ],
  ],
  "meta-lsp/vscode-metatype-support/package.json": [
    [
      /(\s*"version"\s*:\s*").+(",?)/,
      METATYPE_VERSION,
    ],
  ],
  "typegate/tests/**/*.snap": [
    [
      /(\s*static\s*MT_VERSION:\s*&str\s*=\s*").+(";)/,
      METATYPE_VERSION,
    ],
  ],
  "typegraph/python/typegraph/__init__.py": [
    [
      '(version = ").+(")',
      METATYPE_VERSION,
    ],
  ],
  "typegraph/node/sdk/package.json": [
    [
      /(\s*"version"\s*:\s*").+(",?)/,
      METATYPE_VERSION,
    ],
    [/(\s*"description"\s*:\s*").*(",?)/, TAGLINE],
  ],
  "typegraph/core/src/global_store.rs": [[
    /(\s{4}pub static SDK_VERSION.+=\s?").*(".+;)/,
    METATYPE_VERSION,
  ]],
  "typegraph/node/package.json": [
    [
      /(\s*"version"\s*:\s*").+(",?)/,
      METATYPE_VERSION,
    ],
    [/(\s*"description"\s*:\s*").*(",?)/, TAGLINE],
  ],
  "typegraph/python/pyproject.toml": [
    ['(description = ").+(")', TAGLINE],
  ],
  "**/Cargo.toml": [
    [/^(version = ").+(")/, METATYPE_VERSION],
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
  "dev/cross.Dockerfile": [
    ["(ARG GHJK_VERSION=).*()", GHJK_VERSION],
  ],
  "dev/Dockerfile": [
    ["(ARG DENO_VERSION=).*()", DENO_VERSION],
    [
      "(ARG RUST_VERSION=).*()",
      RUST_VERSION,
    ],
    ["(ARG GHJK_VERSION=).*()", GHJK_VERSION],
  ],
  "typegate/src/runtimes/wit_wire/mod.ts": [
    [
      /(const\s+METATYPE_VERSION = ").*(";)/,
      METATYPE_VERSION,
    ],
  ],
  "typegate/src/typegraph/versions.ts": [
    [
      '(const typegraphVersion = ").*(";)',
      TYPEGRAPH_VERSION,
    ],
  ],
  "typegraph/core/src/typegraph.rs": [
    [
      /(static TYPEGRAPH_VERSION: &str = ").*(";)/,
      TYPEGRAPH_VERSION,
    ],
  ],
  "whiz.yaml": [
    ['(  TYPEGRAPH_VERSION: ").+(")', TYPEGRAPH_VERSION],
    [
      '(    GHJK_VERSION: ").+(")',
      GHJK_VERSION,
    ],
  ],
  "website/docusaurus.config.js": [
    ['(  tagline: ").+(",)', TAGLINE],
  ],
  "**/pyproject.toml": [
    ['(version = ").+(")', METATYPE_VERSION],
    [
      /(wasmtime = "\^).+(")/,
      WASMTIME_PY_VERSION,
    ],
  ],
  "examples/**/compose.yml": [
    [
      "(    image: ghcr.io/metatypedev/typegate:v).+()",
      PUBLISHED_VERSION,
    ],
  ],
  "examples/**/pyproject.toml": [
    ['(typegraph = ").+(")', METATYPE_VERSION],
  ],
  "examples/**/package.json": [
    [
      /(\s*"@typegraph\/sdk"\s*:\s*"\^).+(",?)/,
      PUBLISHED_VERSION,
    ],
  ],
  "examples/**/*.ts": [
    [
      /(import\s+.+\s+from "npm:@typegraph\/sdk@)[^\/]+(\/.+";)/,
      PUBLISHED_VERSION,
    ],
  ],
  "typegate/import_map.json": [
    [
      /(\s*"@typegraph\/sdk"\s*:\s*"npm:@typegraph\/sdk@).+(",?)/,
      METATYPE_VERSION,
    ],
    [
      /(\s*"@typegraph\/sdk\/"\s*:\s*"npm:\/@typegraph\/sdk@).+(\/",?)/,
      METATYPE_VERSION,
    ],
  ],
  "CONTRIBUTING.md": [
    [/(GHJK_VERSION=").*(")/, GHJK_VERSION],
  ],
};
