// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.js";

export const lazyTg = () =>
  typegraph("wasmedge_ts", async (g: any) => {
    const pub = Policy.public();
    const wasm = new WasmRuntime();
    const mat = await wasm
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

    // const mdk = await wasm
    //   .fromMdk(
    //     t.struct({
    //       "a": t.float(),
    //       "b": t.float(),
    //     }),
    //     t.integer(),
    //     {
    //       opName: "add",
    //       wasm: "typegate/tests/artifacts/rust.wasm",
    //     },
    //   );

    g.expose({
      test_wasi_ts: mat.withPolicy(pub),
      // test_mdk_ts: mdk.withPolicy(pub),
    });
  });
