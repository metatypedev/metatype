// skip:start

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { GraphQLRuntime } from "@typegraph/sdk/runtimes/graphql.js";

// skip:end

typegraph({
  name: "team-a",
}, (g) => {
  const pub = Policy.public();

  const deno = new DenoRuntime();
  const records = new GraphQLRuntime(
    (process.env?.TG_URL ?? "http://localhost:7890") + "/team-b",
  );

  g.expose({
    version_team_b: records.query(t.struct({}), t.integer(), ["version"]),
    version_team_a: deno.static(t.integer(), 3),
  }, pub);
});
