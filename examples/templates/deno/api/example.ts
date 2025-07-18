import { Policy, t, typegraph } from "jsr:@typegraph/sdk@0.5.1-rc.5";
import { PythonRuntime } from "jsr:@typegraph/sdk@0.5.1-rc.5/runtimes/python";
import { DenoRuntime } from "jsr:@typegraph/sdk@0.5.1-rc.5/runtimes/deno";

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
