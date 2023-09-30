import { Policy, t, typegraph } from "@metatypedev/typegraph";
import { DenoRuntime } from "@metatypedev/typegraph/runtimes/deno";
import { PythonRuntime } from "@metatypedev/typegraph/runtimes/python";

typegraph("test-multiple-runtimes", (g) => {
  const pub = Policy.public();
  const deno = new DenoRuntime();
  const python = new PythonRuntime();

  g.expose({
    add: t
      .func(
        t.struct({ first: t.float(), second: t.float() }),
        t.float(),
        python.fromLambda("lambda x: x['first'] + x['second']")
      )
      .withPolicy(pub),
    multiply: deno
      .func(t.struct({ first: t.float(), second: t.float() }), t.float(), {
        code: "({first, second}) => first * second",
      })
      .withPolicy(pub),
  });
});
