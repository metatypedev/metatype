// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.js";

export const tg = await typegraph("wasmedge_ts", async (g: any) => {
  const pub = Policy.public();
  const wasmedge = new WasmRuntime();
  let mat;

  try {
    mat = await wasmedge
      .fromWasm(
        t.struct({
          "a": t.float(),
          "b": t.float(),
        }),
        t.integer(),
        {
          func: "add",
          wasm: "typegate/tests/artifacts/rust.wasm",
        },
      );
  } catch (e) {
    throw new Error(`Failed to create wasi materializer: ${e}`);
  }

  // expose the wasi materializer
  g.expose({
    test_wasi_ts: mat.withPolicy(pub),
  });
});
