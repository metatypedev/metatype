// skip:start
import { Policy, typegraph } from "@typegraph/sdk";
import { KvRuntime } from "@typegraph/sdk/runtimes/kv";

// skip:end

export const tg = await typegraph(
  {
    name: "key-value",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const kv = new KvRuntime("REDIS");
    const pub = Policy.public();
    g.expose({
      get: kv.get(),
      set: kv.set(),
      delete: kv.delete(),
      keys: kv.keys(),
      values: kv.values(),
    }, pub);
  },
);
