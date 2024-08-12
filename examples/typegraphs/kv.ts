// skip:start
import { Policy, typegraph } from "@typegraph/sdk/index.ts";
import { KvRuntime } from "@typegraph/sdk/runtimes/kv.ts";

// skip:end

export const tg = await typegraph("kv", (g: any) => {
  const kv = new KvRuntime("REDIS");
  const pub = Policy.public();
  g.expose({
    get: kv.get(),
    set: kv.set(),
    delete: kv.delete(),
    keys: kv.keys(),
    values: kv.values(),
  }, pub);
});
