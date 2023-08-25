// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/deno/src/mod.ts";
import { PythonRuntime } from "@typegraph/deno/src/runtimes/python.ts";
import { CREATE, DELETE, NONE, UPDATE } from "@typegraph/deno/src/effects.ts";

const tpe = t.struct({
  "a": t.integer({}, { name: "A" }),
  "raw_int": t.integer().set({
    [CREATE]: 1,
    [UPDATE]: 2,
    [DELETE]: 3,
    [NONE]: 4,
  }),
  "raw_str": t.string().set("2"),
  "secret": t.integer().fromSecret("TEST_VAR"),
  "context": t.string().fromContext("userId"),
  "optional_context": t.string().optional().fromContext("inexistent"),
  "raw_obj": t.struct({ "in": t.integer() }).set({ "in": -1 }),
  // "parent": t.struct({ "value": t.integer().fromParent("..") }),
  "alt_raw": t.string().set("2"),
  "alt_secret": t.string().fromSecret("TEST_VAR"),
  "alt_context": t.string().fromContext("userId"),
  "alt_context_opt": t.string().optional().fromContext("userId"),
  "alt_context_opt_missing": t.string().optional().fromContext("userId"),
  "date": t.datetime().inject("now"),
});

typegraph("injection", (g) => {
  const python = new PythonRuntime();
  const pub = Policy.public();

  g.expose({
    identity: t.func(
      t.struct({ input: tpe }),
      tpe,
      python.fromLambda("lambda x: x['input']"),
    ).withPolicy(pub),
  });
});
