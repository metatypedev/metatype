// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.js";

// skip:end

typegraph({
  name: "rate",
  // highlight-next-line
  rate: {
    // highlight-next-line
    windowLimit: 35,
    // highlight-next-line
    windowSec: 15,
    // highlight-next-line
    queryLimit: 25,
    // highlight-next-line
    contextIdentifier: undefined,
    // highlight-next-line
    localExcess: 0,
    // highlight-next-line
  },
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
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
