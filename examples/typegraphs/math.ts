// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
// skip:end
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

typegraph({
  name: "math",
  // skip:start
  rate: { windowLimit: 2000, windowSec: 60, queryLimit: 200, localExcess: 0 },
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  // skip:end
}, (g) => {
  const pub = Policy.public();

  // we need a runtime to run the functions on
  const deno = new DenoRuntime();

  // we can provide the function code inline
  const random_item_fn =
    "({ items }) => items[Math.floor(Math.random() * items.length)]";

  // the policy implementation is based on functions itself
  const restrict_referer = deno.policy(
    "restrict_referer_policy",
    '(_, context) => context.headers.referer && ["localhost", "metatype"].includes(new URL(context.headers.referer).hostname)',
  );

  // or we can point to a local file that's accessible to the meta-cli
  const fib_module = "scripts/fib.ts";

  g.expose({
    // all functions have inputs and outputs
    fib: deno.import(
      t.struct({ "size": t.integer() }),
      t.list(t.float()),
      {
        module: fib_module,
        name: "default", // name the exported function to run
      },
    ).withPolicy(restrict_referer),
    randomItem: deno.func(
      t.struct({ "items": t.list(t.string()) }),
      t.string(),
      { code: random_item_fn },
    ),
    random: deno.func(
      t.struct({}),
      t.float(),
      { code: "() => Math.random()" }, // more inline code
    ),
  }, pub);
});
