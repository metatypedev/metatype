// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { Policy, t, typegraph } from "@typegraph/sdk";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.js";
import * as path from "std/path/mod.ts";

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

if (Deno.args.length < 2) {
  console.error("Insufficient arguments. Pass three arguments");
  Deno.exit(1);
}

const cwd = Deno.args[1];
const PORT = Deno.args[2];

const gate = `http://localhost:${PORT}`;
const auth = new BasicAuth("admin", "password");

const { serialized, typegate: _gateResponseAdd } = await tgDeploy(tg, {
  baseUrl: gate,
  auth,
  artifactsConfig: {
    prismaMigration: {
      globalAction: {
        create: true,
        reset: false,
      },
      migrationDir: "prisma-migrations",
    },
    dir: cwd,
  },
  typegraphPath: path.join(cwd, "wasm_wire.ts"),
  secrets: {},
});

console.log(serialized);
