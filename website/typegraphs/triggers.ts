// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { HttpRuntime } from "@typegraph/sdk/runtimes/http.js";

// skip:end

typegraph({
  name: "triggers",
}, (g) => {
  // skip:start
  const pub = Policy.public();
  const http = new HttpRuntime("https://random.org/api");
  // skip:end
  // ...
  g.expose({
    flip: http.get(t.struct({}), t.enum_(["head", "tail"]), {
      path: "/flip_coin",
    }),
  }, pub);
});
