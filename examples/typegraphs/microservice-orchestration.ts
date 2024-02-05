// skip:start

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { GraphQLRuntime } from "@typegraph/sdk/runtimes/graphql.js";

/* eslint-disable  @typescript-eslint/no-explicit-any */

function getEnvOrDefault(key: string, defaultValue: string) {
  const glob = globalThis as any;
  const value = glob?.process
    ? glob?.process.env?.[key]
    : glob?.Deno.env.get(key);
  return value ?? defaultValue;
}
// skip:end

typegraph({
  name: "team-a",
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  const pub = Policy.public();

  const deno = new DenoRuntime();
  const records = new GraphQLRuntime(
    getEnvOrDefault("TG_URL", "http://localhost:7890" + "/team-b"),
  );

  g.expose({
    version_team_b: records.query(t.struct({}), t.integer(), ["version"]),
    version_team_a: deno.static(t.integer(), 3),
  }, pub);
});
