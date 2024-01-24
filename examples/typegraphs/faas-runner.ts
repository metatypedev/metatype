// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.js";

// skip:end

typegraph({
  name: "faas-runner",
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  const pub = Policy.public();

  const deno = new DenoRuntime();
  const python = new PythonRuntime();

  const inp = t.struct({ "n": t.integer({ min: 0, max: 100 }) });
  const out = t.integer();

  g.expose({
    pycumsum: python.fromLambda(inp, out, {
      code: `lambda inp: sum(range(inp["n"])`,
    }),
    tscumsum: deno.func(
      inp,
      out,
      {
        code:
          "({n}) => Array.from(Array(5).keys()).reduce((sum, e) => sum + e, 0)",
      },
    ),
  }, pub);
});
