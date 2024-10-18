// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type { DenoTaskDefArgs } from "../deps.ts";

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
    inherit: ["_rust", "_wasm"],
    vars: {
      WASM_FILE: "target/wasm/release/typegraph_core.wasm",
    },
    async fn($) {
      const target = "wasm32-unknown-unknown";
      await $`cargo build -p typegraph_core --target ${target} --release --target-dir target/wasm`;
      await $`cp target/wasm/${target}/release/typegraph_core.wasm $WASM_FILE.tmp`;
      if ($.env["WASM_OPT"]) {
        await $`wasm-opt -Oz $WASM_FILE.tmp -o $WASM_FILE.tmp`;
      }
      await $`wasm-tools component new $WASM_FILE.tmp -o $WASM_FILE`;
    },
  },
  "build-tgraph-ts": {
    dependsOn: "build-tgraph-core",
    inherit: ["build-tgraph-core", "_ecma"],
    async fn($) {
      const genPath = await $.removeIfExists(
        $.workingDir.join("src/typegraph/deno/src/gen"),
      );

      await $`jco transpile $WASM_FILE -o ${genPath} --map metatype:typegraph/host=../host/host.js`;
      // FIXME: deno workspace discovery broken when
      await $`bash -c "deno run -A tools/jsr/fix-declarations.ts"`;
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
    dependsOn: "build-tgraph-core",
    inherit: ["build-tgraph-core", "_python"],
    async fn($) {
      await $.removeIfExists(
        $.workingDir.join("typegraph/python/typegraph/gen"),
      );
      await $`poetry run python -m wasmtime.bindgen $WASM_FILE --out-dir src/typegraph/python/typegraph/gen`;
      await $`poetry run ruff check src/typegraph/python/typegraph`;
    },
  },
  "build-tgraph": {
    dependsOn: ["build-tgraph-py", "build-tgraph-ts-node"],
  },
  "build-pyrt": {
    inherit: "_wasm",
    dependsOn: "gen-pyrt-bind",
    async fn($) {
      const wasmOut = $.env["PYRT_WASM_OUT"] ?? "./target/pyrt.wasm";
      // TODO: support for `world-module` is missing on the `componentize` subcmd
      await $`componentize-py -d ./src/wit/wit-wire.wit componentize -o ${wasmOut} src.pyrt_wit_wire.main`;
      // const target = env["PYRT_TARGET"] ? `--target ${env["PYRT_TARGET"]}` : "";
      // const cwasmOut = env["PYRT_CWASM_OUT"] ?? "./target/pyrt.cwasm";
      // await `wasmtime compile -W component-model ${target} ${wasmOut} -o ${cwasmOut}`;
    },
  },
} satisfies Record<string, DenoTaskDefArgs>;
