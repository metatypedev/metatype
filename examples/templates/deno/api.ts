/*
import { Policy, t, typegraph } from "@typegraph/deno/src/mod.ts";
import { DenoRuntime } from "@typegraph/deno/src/runtimes/deno.ts";
import { PythonRuntime } from "@typegraph/deno/src/runtimes/python.ts";

import { Policy, t, typegraph } from "../../../../typegraph/deno/src/mod.ts";
import { DenoRuntime } from "../../../../typegraph/deno/src/runtimes/deno.ts";
import { PythonRuntime } from "../../../../typegraph/deno/src/runtimes/python.ts";
*/

import { PythonRuntime } from "https://github.com/metatypedev/typegraph/raw/main/deno/src/runtimes/python.ts";
import {
  Policy,
  t,
  typegraph,
} from "https://github.com/metatypedev/typegraph/raw/main/deno/src/mod.ts";
import { DenoRuntime } from "https://github.com/metatypedev/typegraph/raw/main/deno/src/runtimes/deno.ts";

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
