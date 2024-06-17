// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { DenoTaskDefArgs } from "./deps.ts";

const tasks: Record<string, DenoTaskDefArgs> = {
  "build-sys-tgraphs": {
    inherit: ["_rust", "_python"],
    async fn($) {
      const typegraphs = await Array.fromAsync(
        $.path(import.meta.dirname!).join("../typegate/src/typegraphs/")
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
      const sdkPath = $.workingDir.join("typegraph/node/sdk");
      const genPath = await $.removeIfExists(sdkPath.join("src/gen"));
      const distPath = await $.removeIfExists(sdkPath.join("dist"));

      await $`jco transpile $WASM_FILE -o ${genPath} --map metatype:typegraph/host=../host/host.js`;
      await $`pnpm -C typegraph/node install`;
      await $`pnpm -C typegraph/node run sdk-build`;
      await $.co(
        [
          sdkPath.join("package.json").copyToDir(distPath),
          sdkPath.join("package-lock.json").copyToDir(distPath),
          sdkPath.join("LICENSE.md").copyToDir(distPath),
          distPath.join("README.md").symlinkTo(
            $.workingDir.join("README.md").toString(),
          ),
        ],
      );
    },
  },
  "build-tgraph-ts-pub": {
    dependsOn: "build-tgraph-ts",
    inherit: ["build-tgraph-ts"],
    vars: {
      NPM_CONFIG_REGISTRY: "http://localhost:4873",
    },
    async fn($) {
      const distPath = $.workingDir.join("typegraph/node/sdk/dist");
      await $.raw`npm config set "${
        $.env.NPM_CONFIG_REGISTRY!.replace(/^http:/, "")
      }/:_authToken" fooBar`
        .cwd(distPath);
      await $`npm unpublish @typegraph/sdk --force --registry $NPM_CONFIG_REGISTRY`
        .noThrow().cwd(distPath);
      await $`npm publish --tag dev --no-git-checks --force --registry $NPM_CONFIG_REGISTRY`
        .cwd(distPath);

      // FIXME: mutex on lockfile
      await $`ghjk x clean-deno-lock`;
    },
  },
  "build-tgraph-py": {
    dependsOn: "build-tgraph-core",
    inherit: ["build-tgraph-core", "_python"],
    async fn($) {
      await $.removeIfExists($.workingDir.join("typegraph/python/typegraph/gen"));
      await $`poetry run python -m wasmtime.bindgen $WASM_FILE --out-dir typegraph/python/typegraph/gen`;
      await $`poetry run ruff check typegraph/python/typegraph`;
    },
  },
  "build-tgraph": {
    dependsOn: [
      "build-tgraph-py",
      "build-tgraph-ts-pub",
    ],
  },

  "gen-pyrt-bind": {
    inherit: "_wasm",
    async fn($) {
      await $.removeIfExists("./libs/pyrt_wit_wire/wit_wire");
      await $`componentize-py -d ../../wit/wit-wire.wit bindings .`
        .cwd("./libs/pyrt_wit_wire");
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
