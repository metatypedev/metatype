// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.js";

export const tg = await typegraph("wasm-ts", (g) => {
  const pub = Policy.public();
  const wasm = new WasmRuntime();
  const entity = t.struct({
    name: t.string(),
    age: t.integer().optional(),
    level: t.enum_(["bronze", "silver", "gold"]), // wit enum
    attributes: t.list(t.enum_(["attack", "defend", "cast"])), // wit flags
    category: t.struct({ // wit variant
      tag: t.enum_(["a", "b", "c"]),
      value: t.string().optional(),
    }),
  });

  g.expose({
    add: wasm
      .fromWasm(
        t.struct({ "a": t.float(), "b": t.float() }),
        t.integer(),
        { func: "add", wasm: "rust.wasm" },
      ).withPolicy(pub),
    range: wasm
      .fromWasm(
        t.struct({ "a": t.integer(), "b": t.integer() }),
        t.list(t.integer()),
        { func: "range", wasm: "rust.wasm" },
      ).withPolicy(pub),
    record: wasm
      .fromWasm(
        t.struct({}),
        t.list(entity),
        { func: "record-creation", wasm: "rust.wasm" },
      ).withPolicy(pub),
  });
});
