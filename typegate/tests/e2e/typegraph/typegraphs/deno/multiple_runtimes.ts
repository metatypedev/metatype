// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/mod.ts";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.ts";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.ts";

typegraph("test-multiple-runtimes", (g) => {
  const pub = Policy.public();
  const deno = new DenoRuntime();
  const python = new PythonRuntime();

  g.expose({
    add: python.fromLambda(
      t.struct({ "first": t.float(), "second": t.float() }),
      t.float(),
      { code: "lambda x: x['first'] + x['second']" },
    ).withPolicy(pub),
    multiply: deno.func(
      t.struct({ "first": t.float(), "second": t.float() }),
      t.float(),
      { code: "({first, second}) => first * second" },
    ).withPolicy(pub),
  });
});
