import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

typegraph({
  name: "math",
}, (g) => {
  // we need a runtime to run the functions on
  const deno = new DenoRuntime();

  const pub = Policy.public();

  // we can provide the function code inline
  const random_item_fn =
    "({ items }) => items[Math.floor(Math.random() * items.length)]";

  // the policy implementation is based on functions itself
  const restrict_referer = deno.policy(
    "restrict_referer_policy",
    '(_, context) => context["headers"]["referer"] && new URL(context["headers"]["referer"]).pathname === "/math"',
  );

  // or we can point to a local file that's accessible to the meta-cli
  const fib_module = "scripts/fib.ts";

  g.expose({
    fib: deno.import(
      t.struct({ "size": t.integer() }),
      t.list(t.float()),
      {
        module: fib_module,
        name: "default", // name the exported function to run
      },
    ).withPolicy(restrict_referer),
    random: deno.func(
      t.struct({}),
      t.float(),
      { code: "() => Math.random()" }, // more inline code
    ).withPolicy(pub),
    randomItem: deno.func(
      t.struct({ "items": t.list(t.string()) }),
      t.string(),
      { code: random_item_fn },
    ).withPolicy(pub),
  });
});
