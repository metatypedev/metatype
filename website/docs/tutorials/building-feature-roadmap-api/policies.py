from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.random import RandomRuntime
from typegraph.runtimes.deno import DenoRuntime
from typegraph.graph.params import Auth
from typegraph.providers.prisma import PrismaRuntime


@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"])
)
def roadmap(g: Graph):
    pub = Policy.public()
    random = RandomRuntime()
    db = PrismaRuntime("db", "POSTGRES")
    deno = DenoRuntime()

    bucket = t.struct(
        {
            # auto generate ids during creation
            "id": t.integer(as_id=True, config={"auto": True}),
            "name": t.string(),
            "ideas": t.array(t.ref("idea")),
        },
        name="bucket",
    )

    idea = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "name": t.string(),
            "authorEmail": t.email(),
            "votes": t.array(t.ref("vote")),
            "bucket": t.ref("bucket"),
        },
        name="idea",
    )

    vote = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "authorEmail": t.email(),
            "importance": t.enum(["medium", "important", "critical"]).optional(),
            "desc": t.string().optional(),
            "idea": t.ref("idea"),
        },
        name="vote",
    )

    g.auth(Auth.basic(["andim"]))

    admins = deno.policy(
        "admins",
        """
  (_args, { context }) => !!context.username
""",
    )

    g.expose(
        pub,
        create_bucket=db.create(bucket).with_policy(admins),
        get_buckets=db.find_many(bucket),
        get_idea=db.find_many(idea),
        create_idea=db.create(idea),
        create_vote=db.create(vote),
    )
