// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.js";

// skip:end

typegraph({
  name: "auth",
  // highlight-next-line
  cors: {
    // highlight-next-line
    allowOrigin: ["https://not-this.domain"],
    // highlight-next-line
    allowHeaders: ["x-custom-header"],
    // highlight-next-line
    exposeHeaders: ["header-1"],
    // highlight-next-line
    allowCredentials: true,
    // highlight-next-line
    maxAgeSec: 60,
    // highlight-next-line
    allowMethods: ["GET"],
  },
}, (g) => {
  const random = new RandomRuntime({ seed: 0 });
  const pub = Policy.public();

  g.expose({
    catch_me_if_you_can: random.gen(t.string()).withPolicy(pub),
  });
});
