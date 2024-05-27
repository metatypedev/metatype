// skip:start
import { fx, Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

await typegraph({
  name: "func-gql",
  rate: { windowLimit: 2000, windowSec: 60, queryLimit: 200, localExcess: 0 },
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  // skip:end
  const deno = new DenoRuntime();
  const db = new PrismaRuntime("db", "POSTGRES");

  const idea = t.struct(
    {
      "id": t.uuid({ asId: true, config: { "auto": true } }),
      "name": t.string(),
      "desc": t.string().optional(),
      "authorEmail": t.email(),
      "votes": t.list(g.ref("vote")),
    },
    { name: "idea" },
  );
  const vote = t.struct(
    {
      "id": t.uuid({ asId: true, config: { "auto": true } }),
      "authorEmail": t.email(),
      "idea": g.ref("idea"),
    },
    { name: "vote" },
  );

  // Policy.internal means only custom functions
  // can access these root functions
  g.expose({
    i_get_idea: db.findUnique(idea),
    i_create_vote: db.create(vote),
  }, Policy.internal());

  g.expose({
    createIdea: db.create(idea),
    createVote: deno.import(
      t.struct({ "ideaId": t.uuid(), "authorEmail": t.email() })
        .rename("CreateVoteInput"),
      t.struct({
        // rename here  is necessary to make
        // `fromParent` down below work
        "voteId": t.uuid().rename("Vote_id"),
        // using `reduce` we improve the API allowing
        // create calls to get the newly created object
        // without having to send this data from the
        // custom funciton
        "vote": db.findUnique(vote)
          .reduce({
            "where": {
              "id": g.inherit().fromParent("Vote_id"),
            },
          }),
      }).rename("CreateVoteOutput"),
      {
        module: "scripts/createVote.ts",
        name: "handle", // name the exported function to run
        effect: fx.create(),
      },
    ),
  }, Policy.public());
  // skip:start
});
