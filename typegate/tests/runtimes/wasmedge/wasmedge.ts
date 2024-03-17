// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { WasmEdgeRuntime } from "@typegraph/sdk/runtimes/wasmedge.js";

typegraph("wasmedge ts", (g: any) => {
  const pub = Policy.public();
  const wasmedge = new WasmEdgeRuntime();

  g.expose({
    test_wasi_ts: wasmedge
      .wasi(
        t.struct({
          "a": t.float(),
          "b": t.float(),
        }),
        t.integer(),
        {
          func: "add",
          wasm: "rust.wasm",
        },
      ).withPolicy(pub),
  });
});
