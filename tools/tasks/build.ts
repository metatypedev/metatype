// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { DenoTaskDefArgs } from "@ghjk/ts";

export default {
  "build-sys-tgraphs": {
    inherit: ["_rust", "_python"],
    async fn($) {
      const typegraphs = await Array.fromAsync(
        $.workingDir
          .join("src/typegate/src/typegraphs/")
          .expandGlob("**/*.py", {
            includeDirs: false,
            globstar: true,
          }),
      );
      for (const { path } of typegraphs) {
        const target = path.toString().replace(/\.py$/, ".json");
        $.logStep("serializing", path);
        await $`cargo run -p meta-cli -q --color always -- 
        serialize -f ${path} -1 --pretty -o ${target}`;
      }
    },
  },

  "build-tgraph-core": {
    inherit: ["_rust"],
    vars: {
      TG_CODEGEN: "src/typegraph/specs/codegen/tg-codegen",
    },
    async fn($) {
      const genPath = await $.removeIfExists(
        $.workingDir.join("src/typegraph/core/src/types/sdk"),
      );

      await $`chmod +x $TG_CODEGEN`;
      await $`$TG_CODEGEN rust-lib ${genPath}`;
    },
  },
  "build-tgraph-ts": {
    inherit: ["build-tgraph-core", "_ecma"],
    async fn($) {
      const genPath = await $.removeIfExists(
        $.workingDir.join("src/typegraph/deno/src/gen"),
      );

      await $`$TG_CODEGEN typescript ${genPath}`;
    },
  },
  "build-tgraph-rpc": {
    inherit: ["build-tgraph-core", "_rust"],
    async fn($) {
      const genPath = await $.removeIfExists(
        $.workingDir.join("src/meta-cli/src/typegraph/rpc"),
      );

      await $`$TG_CODEGEN rust-rpc ${genPath}`;
    },
  },
  "build-tgraph-ts-node": {
    dependsOn: "build-tgraph-ts",
    inherit: ["build-tgraph-ts"],
    async fn($) {
      await $`bash -c "deno run -A tools/jsr/deno2node.ts"`;
    },
  },
  "build-tgraph-ts-jsr": {
    async fn($) {
      await $`bash -c "deno run -A tools/jsr/jsr-gen.ts"`;
    },
  },
  "build-tgraph-py": {
    inherit: ["build-tgraph-core", "_python"],
    async fn($) {
      const genPath = await $.removeIfExists(
        $.workingDir.join("src/typegraph/python/typegraph/gen"),
      );

      await $`$TG_CODEGEN python ${genPath}`;
      await $`poetry run ruff check src/typegraph/python/typegraph`;
    },
  },
  "build-tgraph": {
    dependsOn: [
      "build-tgraph-core",
      "build-tgraph-rpc",
      "build-tgraph-py",
      "build-tgraph-ts-node",
    ],
  },
  "build-pyrt": {
    inherit: "_wasm",
    dependsOn: "gen-pyrt-bind",
    async fn($) {
      await $`echo $PATH && which componentize-py`;
      await $`which componentize-py | xargs dirname | xargs ls -lsa`;
      await $`which componentize-py | xargs realpath | xargs dirname | xargs ls -lsa`;
      const wasmOut = $.env["PYRT_WASM_OUT"] ?? "./target/pyrt.wasm";
      // TODO: support for `world-module` is missing on the `componentize` subcmd
      await $`componentize-py -d ./src/wit/wit-wire.wit componentize -o ${wasmOut} src.pyrt_wit_wire.main`;
      // const target = env["PYRT_TARGET"] ? `--target ${env["PYRT_TARGET"]}` : "";
      // const cwasmOut = env["PYRT_CWASM_OUT"] ?? "./target/pyrt.cwasm";
      // await `wasmtime compile -W component-model ${target} ${wasmOut} -o ${cwasmOut}`;
    },
  },
} satisfies Record<string, DenoTaskDefArgs>;
