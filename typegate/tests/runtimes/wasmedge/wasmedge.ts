// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { WasmEdgeRuntime } from "@typegraph/sdk/runtimes/wasmedge.js";

export const tg = await typegraph("wasmedge_ts", async (g: any) => {
  const pub = Policy.public();
  const wasmedge = new WasmEdgeRuntime();

  try {
    const mat = await wasmedge
      .wasi(
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
    g.expose({
      test_wasi_ts: mat.withPolicy(pub),
    });
  } catch (e) {
    console.error(e);
  }
});
