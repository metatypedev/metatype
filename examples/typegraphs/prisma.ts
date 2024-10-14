import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.ts";

typegraph(
  {
    name: "roadmap-prisma",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const pub = Policy.public();
    const db = new PrismaRuntime("db", "POSTGRES");

    const bucket = t.struct(
      {
        id: t.integer({}, { config: { auto: true } }).id(),
        name: t.string(),
        ideas: t.list(g.ref("idea")),
      },
      { name: "bucket" },
    );
    const idea = t.struct(
      {
        id: t.uuid({ config: { auto: true } }).id(),
        name: t.string(),
        authorEmail: t.email(),
        votes: t.list(g.ref("vote")),
        bucket: g.ref("bucket"),
      },
      { name: "idea" },
    );
    const vote = t.struct(
      {
        id: t.uuid({ config: { auto: true } }).id(),
        authorEmail: t.email(),
        importance: t.enum_(["medium", "important", "critical"]).optional(),
        desc: t.string().optional(),
        idea: g.ref("idea"),
      },
      { name: "vote" },
    );

    g.expose(
      {
        get_buckets: db.findMany(bucket),
        create_bucket: db.create(bucket),
        get_idea: db.findMany(idea),
        create_idea: db.create(idea),
        get_vote: db.create(vote),
      },
      pub,
    );
  },
);
