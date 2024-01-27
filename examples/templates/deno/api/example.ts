import { Policy, t, typegraph } from "npm:@typegraph/sdk@0.3.2/index.js";
import { PythonRuntime } from "npm:@typegraph/sdk@0.3.2/runtimes/python.js";
import { DenoRuntime } from "npm:@typegraph/sdk@0.3.2/runtimes/deno.js";

typegraph("example", (g) => {
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
