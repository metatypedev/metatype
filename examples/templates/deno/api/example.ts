import { Policy, t, typegraph } from "jsr:@typegraph/sdk@0.4.10/index.ts";
import { PythonRuntime } from "jsr:@typegraph/sdk@0.4.10/runtimes/python.ts";
import { DenoRuntime } from "jsr:@typegraph/sdk@0.4.10/runtimes/deno.ts";

await typegraph("example", (g) => {
  const pub = Policy.public();
  const deno = new DenoRuntime();
  const python = new PythonRuntime();

  g.expose({
    add: python
      .fromLambda(
        t.struct({ first: t.float(), second: t.float() }),
        t.float(),
        { code: "lambda x: x['first'] + x['second']" },
      )
      .withPolicy(pub),
    multiply: deno
      .func(t.struct({ first: t.float(), second: t.float() }), t.float(), {
        code: "({first, second}) => first * second",
      })
      .withPolicy(pub),
  });
});
