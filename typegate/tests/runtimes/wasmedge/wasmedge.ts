// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.js";

export const tg = await typegraph("wasmedge_ts", (g) => {
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
        t.integer(),
        { func: "range", wasm: "rust.wasm" },
      ).withPolicy(pub),
  });
});
