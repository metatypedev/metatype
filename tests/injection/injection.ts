// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { CREATE, DELETE, READ, UPDATE } from "@typegraph/sdk/effects";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno";

const tpe = t.struct({
  a: t.integer({}, { name: "A" }),
  raw_int: t.integer().set({
    [CREATE]: 1,
    [UPDATE]: 2,
    [DELETE]: 3,
    [READ]: 4,
  }),
  raw_str: t.string().set("2"),
  secret: t.integer().fromSecret("TEST_VAR"),
  context: t.string().fromContext("userId"),
  optional_context: t.string().optional().fromContext("inexistent"),
  raw_obj: t.struct({ in: t.integer() }).set({ in: -1 }),
  alt_raw: t.string().set("2"),
  alt_secret: t.string().fromSecret("TEST_VAR"),
  alt_context: t.string().fromContext("userId"),
  alt_context_opt: t.string().optional().fromContext("userId"),
  alt_context_opt_missing: t.string().optional().fromContext("userId"),
  date: t.datetime().inject("now"),
});

const out = t.struct({
  a: t.integer(),
  raw_int: t.integer(),
  raw_str: t.string(),
  secret: t.integer(),
  context: t.string(),
  optional_context: t.string().optional(),
  raw_obj: t.struct({ in: t.integer() }),
  alt_raw: t.string(),
  alt_secret: t.string(),
  alt_context: t.string(),
  alt_context_opt: t.string().optional(),
  alt_context_opt_missing: t.string().optional(),
  date: t.datetime(),
});

export const tg = await typegraph("injection", (g: any) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  g.expose({
    test: deno.func(t.struct({ input: tpe }), t.struct({ input: out }), {
      code: "x => x",
    }).withPolicy(pub),
  });
});
