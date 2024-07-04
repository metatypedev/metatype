import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { Auth } from "@typegraph/sdk/params.ts";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.ts";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.ts";

typegraph(
  {
    name: "roadmap-rest",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const pub = Policy.public();
    const db = new PrismaRuntime("db", "POSTGRES");
    const deno = new DenoRuntime();

    const bucket = t.struct(
      {
        id: t.integer({}, { asId: true, config: { auto: true } }),
        name: t.string(),
        ideas: t.list(g.ref("idea")),
      },
      { name: "bucket" }
    );

    const idea = t.struct(
      {
        id: t.uuid({ asId: true, config: { auto: true } }),
        name: t.string(),
        authorEmail: t.email(),
        votes: t.list(g.ref("vote")),
        bucket: g.ref("bucket"),
      },
      { name: "idea" }
    );

    const vote = t.struct(
      {
        id: t.uuid({ asId: true, config: { auto: true } }),
        authorEmail: t.email(),
        importance: t.enum_(["medium", "important", "critical"]).optional(),
        desc: t.string().optional(),
        idea: g.ref("idea"),
      },
      { name: "vote" }
    );

    g.auth(Auth.basic(["andim"]));

    const admins = deno.policy(
      "admins",
      "(_args, { context }) => !!context.username"
    );

    g.expose(
      {
        create_bucket: db.create(bucket).withPolicy(admins),
        get_buckets: db.findMany(bucket),
        get_bucket: db.findFirst(bucket),
        get_idea: db.findMany(idea),
        create_idea: db.create(idea).reduce({
          data: {
            name: g.inherit(),
            authorEmail: g.inherit(),
            votes: g.inherit(),
            bucket: { connect: g.inherit() },
          },
        }),
        create_vote: db.create(vote),
      },
      pub
    );

    g.rest(
      `
        query get_buckets {
            get_buckets {
                id 
                name
                ideas {
                    id
                    name
                    authorEmail
                }
            }
        }
        `
    );

    g.rest(
      `
        query get_bucket($id: Integer) {
            get_bucket(where:{
                id: $id
            }) {
                id 
                name
                ideas {
                    id
                    name
                    authorEmail
                }
            }
        }
        `
    );
  }
);
