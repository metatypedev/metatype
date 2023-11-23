import { Policy, t, typegraph } from "npm:@typegraph/sdk@0.2.4";
import { PythonRuntime } from "npm:@typegraph/sdk@0.2.4/runtimes/python";
import { DenoRuntime } from "npm:@typegraph/sdk@0.2.4/runtimes/deno";

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
