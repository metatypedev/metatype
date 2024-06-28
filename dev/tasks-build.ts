// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { DenoTaskDefArgs } from "./deps.ts";

const tasks: Record<string, DenoTaskDefArgs> = {
  "build-sys-tgraphs": {
    inherit: ["_rust", "_python"],
    async fn($) {
      const typegraphs = await Array.fromAsync(
        $.path(import.meta.dirname!)
          .join("../typegate/src/typegraphs/")
          .expandGlob("**/*.py", {
            includeDirs: false,
            globstar: true,
          }),
      );
      for (const { path } of typegraphs) {
        const target = path.toString().replace(/\.py$/, ".json");
        $.logStep("serializing", path);
        return $`cargo run -p meta-cli -q --color always -- 
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
      const denoSdkPath = $.workingDir.join("typegraph/deno/sdk");
      const genPath = await $.removeIfExists(denoSdkPath.join("src/gen"));

      await $`jco transpile $WASM_FILE -o ${genPath} --map metatype:typegraph/host=../host/host.js`;
      await $`deno run -A typegraph/deno/dev/fix-declarations.ts`;
    },
  },
  "build-tgraph-ts-node": {
    dependsOn: "build-tgraph-ts",
    inherit: ["build-tgraph-ts"],
    async fn($) {
      await $`deno run -A typegraph/deno/dev/deno2node.ts`;
    },
  },
  "build-jsr-pub": {
    async fn($) {
      await $`deno run -A typegraph/deno/dev/jsr-gen.ts`;
      await $`cd typegraph/deno/sdk && deno publish --dry-run --allow-slow-types --allow-dirty`;
    },
  },
  "build-tgraph-py": {
    dependsOn: "build-tgraph-core",
    inherit: ["build-tgraph-core", "_python"],
    async fn($) {
      await $.removeIfExists(
        $.workingDir.join("typegraph/python/typegraph/gen"),
      );
      await $`poetry run python -m wasmtime.bindgen $WASM_FILE --out-dir typegraph/python/typegraph/gen`;
      await $`poetry run ruff check typegraph/python/typegraph`;
    },
  },
  "build-tgraph": {
    dependsOn: ["build-tgraph-py", "build-tgraph-ts-node"],
  },

  "gen-pyrt-bind": {
    inherit: "_wasm",
    async fn($) {
      await $.removeIfExists("./libs/pyrt_wit_wire/wit_wire");
      await $`componentize-py -d ../../wit/wit-wire.wit bindings .`.cwd(
        "./libs/pyrt_wit_wire",
      );
    },
  },
  "build-pyrt": {
    inherit: "_wasm",
    dependsOn: "gen-pyrt-bind",
    async fn($) {
      const wasmOut = $.env["PYRT_WASM_OUT"] ?? "./target/pyrt.wasm";
      // TODO: support for `world-module` is missing on the `componentize` subcmd
      await $`componentize-py -d ./wit/wit-wire.wit componentize -o ${wasmOut} libs.pyrt_wit_wire.main`;
      // const target = env["PYRT_TARGET"] ? `--target ${env["PYRT_TARGET"]}` : "";
      // const cwasmOut = env["PYRT_CWASM_OUT"] ?? "./target/pyrt.cwasm";
      // await `wasmtime compile -W component-model ${target} ${wasmOut} -o ${cwasmOut}`;
    },
  },
};
export default tasks;
