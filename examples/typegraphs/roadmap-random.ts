import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.js";

// skip:next-line
/* eslint-disable  @typescript-eslint/no-unused-vars */

await typegraph({
  name: "roadmap-random",
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  // skip:start
  const _bucket = t.struct(
    {
      "id": t.integer({}, { asId: true }),
      "name": t.string(),
    },
  );
  const _vote = t.struct(
    {
      "id": t.uuid(),
      "authorEmail": t.email(),
      "importance": t.enum_(
        ["medium", "important", "critical"],
      ).optional(), // `enum_` is also a shorthand over `t.string`
      "createdAt": t.datetime(),
      "desc": t.string().optional(), // makes it optional
    },
  );
  // skip:end

  const idea = t.struct(
    {
      "id": t.uuid({ asId: true }), // email is just a shorthand alias for `t.string({}, {{format: "uuid"}: undefined})`
      "name": t.string(),
      "authorEmail": t.email(), // another string shorthand
    },
  );

  const random = new RandomRuntime({ seed: 1 });
  const pub = Policy.public();
  g.expose({ get_idea: random.gen(idea) }, pub);
});
