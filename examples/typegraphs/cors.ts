// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.ts";

// skip:end

await typegraph(
  {
    name: "cors",
    // highlight-start
    cors: {
      allowOrigin: ["https://not-this.domain"],
      allowHeaders: ["x-custom-header"],
      exposeHeaders: ["header-1"],
      allowCredentials: true,
      maxAgeSec: 60,
    },
    // highlight-end
  },
  (g) => {
    const random = new RandomRuntime({ seed: 0 });

    g.expose(
      {
        catch_me_if_you_can: random.gen(t.string()),
      },
      Policy.public()
    );
  }
);
