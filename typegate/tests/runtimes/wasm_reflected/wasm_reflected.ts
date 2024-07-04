// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.ts";

export const tg = await typegraph("wasm-reflected-ts", (g: any) => {
  const entity = t.struct({
    name: t.string(),
    age: t.integer().optional(),
    profile: t.struct({
      level: t.enum_(["bronze", "silver", "gold"]), // wit enum
      attributes: t.list(t.enum_(["attack", "defend", "cast"])), // wit flags
      category: t.struct({
        // wit variant
        tag: t.enum_(["a", "b", "c"]),
        value: t.string().optional(),
      }),
      metadatas: t.list(t.list(t.either([t.string(), t.float()]))),
    }),
  });

  const wasm = WasmRuntime.reflected("rust.wasm");
  g.expose(
    {
      add: wasm.export(t.struct({ a: t.float(), b: t.float() }), t.integer(), {
        name: "add",
      }),
      range: wasm.export(
        t.struct({ a: t.integer().optional(), b: t.integer() }),
        t.list(t.integer()),
        { name: "range" },
      ),
      record: wasm.export(t.struct({}), t.list(entity), {
        name: "record-creation",
      }),
      identity: wasm.export(t.struct({ arg0: entity }), entity, {
        name: "identity",
      }),
    },
    Policy.public(),
  );
});
