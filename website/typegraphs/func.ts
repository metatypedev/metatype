import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

// skip:start
import { Auth } from "@typegraph/sdk/params.js";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.js";
// skip:end

typegraph({
  // skip:start
  name: "roadmap-func",
  // skip:end
}, (g) => {
  // skip:start
  const pub = Policy.public();
  const db = new PrismaRuntime("db", "POSTGRES");
  // skip:end
  const deno = new DenoRuntime();

  // skip:start
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

  g.auth(Auth.basic(["andim"]));

  const admins = deno.policy(
    "admins",
    `
        (_args, { context }) => !!context.username
    `,
  );
  // skip:end

  g.expose({
    // skip:start
    create_bucket: db.create(bucket).withPolicy(admins),
    get_buckets: db.findMany(bucket),
    get_bucket: db.findFirst(bucket),
    get_idea: db.findMany(idea),
    create_idea: db.create(idea).reduce(
      {
        "data": {
          "name": g.inherit(),
          "authorEmail": g.inherit(),
          "votes": g.inherit(),
          "bucket": { "connect": g.inherit() },
        },
      },
    ),
    create_vote: db.create(vote),
    // skip:end
    parse_markdown: deno.import(
      t.struct({ "raw": t.string() }),
      t.string(),
      {
        module: "scripts/md2html.ts.src",
        name: "parse",
      },
    ),
  }, pub);

  // skip:start
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
        `,
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
        `,
  );
  // skip:end
});
