// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.js";

export const tg = await typegraph("wasm-ts", (g) => {
  const pub = Policy.public();
  const wasm = new WasmRuntime();

  g.expose({
    // expose the wasi materializer
    testWitAdd: wasm
      .fromWasm(
        t.struct({ "a": t.float(), "b": t.float() }),
        t.integer(),
        { func: "add", wasm: "rust.wasm" },
      ).withPolicy(pub),
    testWitList: wasm
      .fromWasm(
        t.struct({ "a": t.integer(), "b": t.integer() }),
        t.list(t.integer()),
        { func: "range", wasm: "rust.wasm" },
      ).withPolicy(pub),
    // TODO: handle enum, variants (decide on the format) and object output
    // testWitComplexOut: wasm
    //   .fromWasm(
    //     t.struct({}),
    //     t.list(t.integer()),
    //     { func: "complex-output", wasm: "rust.wasm" },
    //   ).withPolicy(pub),
  });
});
