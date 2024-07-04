// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.ts";

export const tg = await typegraph("wasm-duplicate-ts", (g: any) => {
  const wasm1 = WasmRuntime.wire("rust.wasm");
  const wasm2 = WasmRuntime.wire("rust.wasm");

  g.expose(
    {
      add1: wasm1
        .handler(
          t.struct({ a: t.float(), b: t.float() }).rename("add_args"),
          t.integer(),
          { name: "add" },
        )
        .rename("add"),
      add2: wasm2
        .handler(
          t.struct({ a: t.float(), b: t.float() }).rename("add_args2"),
          t.integer(),
          { name: "add" },
        )
        .rename("add2"),
    },
    Policy.public(),
  );
});
