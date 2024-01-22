// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

// skip:end

typegraph({
  name: "deno",
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  const fib = deno.func(
    t.struct({ "n": t.float() }),
    t.struct({ "res": t.integer(), "ms": t.float() }),
    {
      code: `
            ({ n }) => {
                let a = 0, b = 1, c;
                const start = performance.now();
                for (
                    let i = 0;
                    i < Math.min(n, 10);
                    c = a + b, a = b, b = c, i += 1
                );
                return {
                    res: b,
                    ms: performance.now() - start,
                };
            }
        `,
    },
  );

  g.expose({
    compute_fib: fib,
  }, pub);
});
