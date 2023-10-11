import { PythonRuntime } from "npm:@typegraph/sdk/runtimes/python.ts";
import { Policy, t, typegraph } from "npm:@typegraph/sdk/mod.ts";
import { DenoRuntime } from "npm:@typegraph/sdk/runtimes/deno.ts";

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
