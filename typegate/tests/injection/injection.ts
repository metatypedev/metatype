// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { CREATE, DELETE, READ, UPDATE } from "@typegraph/sdk/effects.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

const tpe = t.struct({
  "a": t.integer({}, { name: "A" }),
  "raw_int": t.integer().set({
    [CREATE]: 1,
    [UPDATE]: 2,
    [DELETE]: 3,
    [READ]: 4,
  }),
  "raw_str": t.string().set("2"),
  "secret": t.integer().fromSecret("TEST_VAR"),
  "context": t.string().fromContext("userId"),
  "optional_context": t.string().optional().fromContext("inexistent"),
  "raw_obj": t.struct({ "in": t.integer() }).set({ "in": -1 }),
  "alt_raw": t.string().set("2"),
  "alt_secret": t.string().fromSecret("TEST_VAR"),
  "alt_context": t.string().fromContext("userId"),
  "alt_context_opt": t.string().optional().fromContext("userId"),
  "alt_context_opt_missing": t.string().optional().fromContext("userId"),
  "date": t.datetime().inject("now"),
});

export const tg = await typegraph("injection", (g: any) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  g.expose({
    test: deno.identity(t.struct({ input: tpe })).withPolicy(pub),
  });
});
