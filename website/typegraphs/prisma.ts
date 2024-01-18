import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.js";

typegraph({
  name: "roadmap-py",
}, (g) => {
  const pub = Policy.public();
  const db = new PrismaRuntime("db", "POSTGRES");

  const bucket = t.struct(
    {
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

  g.expose({
    get_buckets: db.findMany(bucket),
    create_bucket: db.create(bucket),
    get_idea: db.findMany(idea),
    create_idea: db.create(idea),
    get_vote: db.create(vote),
  }, pub);
});
