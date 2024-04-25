import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

typegraph({
  name: "random-field",
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  const bonusItems = t.list(t.enum_(["+1 gold", "+1 metal"]));
  const dailyBonus = t.struct(
    {
      performance: t.integer(),
      bonus: bonusItems.fromRandom(), // this field is now generated randomly
    },
  );

  // set a custom seed
  g.configureRandomInjection({ seed: 1234 });

  g.expose({
    get_bonus: deno.func(
      dailyBonus,
      t.string(),
      {
        code: ({ performance, bonus }) =>
          `Daily bonus: ${(performance > 100 ? bonus : ["none"]).join(", ")}`,
      },
    ),
  }, pub);
});
