// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.js";

// skip:end

typegraph({
  name: "rate",
}, (g) => {
  const random = new RandomRuntime({ seed: 0 });
  const pub = Policy.public();

  g.expose({
    lightweight_call: random.gen(t.string()).rate({ calls: true, weight: 1 }),
    medium_call: random.gen(t.string()).rate({ calls: true, weight: 5 }),
    heavy_call: random.gen(t.string()).rate({ calls: true, weight: 15 }),
    by_result_count: random.gen(
      t.list(t.string()),
    ).rate({ calls: false, weight: 2 }), // increment by # of results returned
  }, pub);
});
