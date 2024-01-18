import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { Auth } from "@typegraph/sdk/params.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.js";

typegraph({
  name: "roadmap",
}, (g) => {
  const pub = Policy.public();
  const db = new PrismaRuntime("db", "POSTGRES");
  const deno = new DenoRuntime();

  const bucket = t.struct(
    {
      // auto generate ids during creation
      "id": t.integer({}, { asId: true, config: { "auto": true } }),
      "name": t.string(),
      "ideas": t.list(g.ref("idea")),
    },
  ).rename("bucket");

  const idea = t.struct(
    {
      "id": t.uuid({ asId: true, config: { "auto": true } }),
      "name": t.string(),
      "authorEmail": t.email(),
      "votes": t.list(g.ref("vote")),
      "bucket": g.ref("bucket"),
    },
  ).rename("idea");

  const vote = t.struct(
    {
      "id": t.uuid({ asId: true, config: { "auto": true } }),
      "authorEmail": t.email(),
      "importance": t.enum_(["medium", "important", "critical"]).optional(),
      "desc": t.string().optional(),
      "idea": g.ref("idea"),
    },
  ).rename("vote");

  g.auth(Auth.basic(["andim"]));

  const admins = deno.policy(
    "admins",
    "(_args, { context }) => !!context.username",
  );

  g.expose({
    create_bucket: db.create(bucket).withPolicy(admins),
    get_buckets: db.findMany(bucket),
    get_idea: db.findMany(idea),
    create_idea: db.create(idea),
    create_vote: db.create(vote),
  }, pub);
});
