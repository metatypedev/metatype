// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.js";

export const tg = await typegraph("wasm-reflected-ts", (g: any) => {
  const entity = t.struct({
    name: t.string(),
    age: t.integer().optional(),
    profile: t.struct({
      level: t.enum_(["bronze", "silver", "gold"]), // wit enum
      attributes: t.list(t.enum_(["attack", "defend", "cast"])), // wit flags
      category: t.struct({ // wit variant
        tag: t.enum_(["a", "b", "c"]),
        value: t.string().optional(),
      }),
      metadatas: t.list(t.list(t.either([t.string(), t.float()]))),
    }),
  });

  const wasm = WasmRuntime.reflected("rust.wasm");
  g.expose({
    add: wasm.fromExport(
      t.struct({ "a": t.float(), "b": t.float() }),
      t.integer(),
      { func: "add" },
    ),
    range: wasm.fromExport(
      t.struct({ "a": t.integer().optional(), "b": t.integer() }),
      t.list(t.integer()),
      { func: "range" },
    ),
    record: wasm.fromExport(
      t.struct({}),
      t.list(entity),
      { func: "record-creation" },
    ),
    identity: wasm.fromExport(
      t.struct({ "arg0": entity }),
      entity,
      { func: "identity" },
    ),
  }, Policy.public());
});
