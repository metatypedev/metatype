import { Policy, t, typegraph } from "../../typegraph/node/sdk/dist/index.js";
import { DenoRuntime } from "../../typegraph/node/sdk/dist/runtimes/deno.js";
import { PythonRuntime } from "../../typegraph/node/sdk/dist/runtimes/python.js";

await typegraph("example", (g: any) => {
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
