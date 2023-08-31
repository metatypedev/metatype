// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/deno/src/mod.ts";
import { DenoRuntime } from "@typegraph/deno/src/runtimes/deno.ts";
import { PythonRuntime } from "@typegraph/deno/src/runtimes/python.ts";

typegraph("test-multiple-runtimes", (g) => {
  const pub = Policy.public();
  const deno = new DenoRuntime();
  const python = new PythonRuntime();

  g.expose({
    add: t.func(
      t.struct({ "first": t.float(), "second": t.float() }),
      t.float(),
      python.fromLambda("lambda x: x['first'] + x['second']"),
    ).withPolicy(pub),
    multiply: deno.func(
      t.struct({ "first": t.float(), "second": t.float() }),
      t.float(),
      { code: "({first, second}) => first * second" },
    ).withPolicy(pub),
  });
});
