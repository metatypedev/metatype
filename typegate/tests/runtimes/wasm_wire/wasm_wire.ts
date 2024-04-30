// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.js";

export const tg = await typegraph("wasm-wire-ts", (g: any) => {
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
    }).rename("profile"),
  }).rename("entity");

  const wasm = WasmRuntime.wire("rust.wasm");
  g.expose({
    add: wasm.handler(
      t.struct({ "a": t.float(), "b": t.float() }).rename("add_args"),
      t.integer(),
      { func: "add" },
    ).rename("add"),
    range: wasm.handler(
      t.struct({ "a": t.integer().optional(), "b": t.integer() }).rename(
        "range_args",
      ),
      t.list(t.integer()),
      { func: "range" },
    ).rename("range"),
    record: wasm.handler(
      t.struct({}),
      t.list(entity),
      { func: "record-creation" },
    ).rename("record-creation"),
    identity: wasm.handler(
      entity,
      entity,
      { func: "identity" },
    ).rename("identity"),
  }, Policy.public());
});
