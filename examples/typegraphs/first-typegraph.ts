import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.js";

typegraph({
  name: "first-typegraph",
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  // declare runtimes and policies
  const random = new RandomRuntime({});
  const pub = Policy.public();

  // declare types
  const message = t.struct(
    {
      "id": t.integer(),
      "title": t.string(),
      "user_id": t.integer(),
    },
  );

  // expose them with policies
  g.expose({
    // input → output via materializer
    get_message: random.gen(message),
  }, pub);
});
