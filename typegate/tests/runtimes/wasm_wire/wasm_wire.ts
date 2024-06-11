// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.js";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.js";

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
  const random = new RandomRuntime({});
  g.expose({
    add: wasm.handler(
      t.struct({ "a": t.float(), "b": t.float() }).rename("add_args"),
      t.integer(),
      { name: "add" },
    ).rename("add"),
    range: wasm.handler(
      t.struct({ "a": t.integer().optional(), "b": t.integer() }).rename(
        "range_args",
      ),
      t.list(t.integer()),
      { name: "range" },
    ).rename("range"),
    record: wasm.handler(
      t.struct({}),
      t.list(entity),
      { name: "record-creation" },
    ).rename("record-creation"),
    identity: wasm.handler(
      entity,
      entity,
      { name: "identity" },
    ).rename("identity"),
    random: random.gen(entity).withPolicy(Policy.internal()),
    hundred: wasm.handler(
      t.struct({}),
      t.list(entity),
      { name: "hundred-random" },
    ).rename("hundred-random"),
  }, Policy.public());
});
