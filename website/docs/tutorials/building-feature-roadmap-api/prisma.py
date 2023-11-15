from typegraph import typegraph, Policy, t, Graph
from typegraph.providers.prisma import PrismaRuntime
from typegraph.graph.params import Cors


@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:next-line
    name="roadmap-prisma",
)
def roadmap_py(g: Graph):
    pub = Policy.public()
    db = PrismaRuntime("db", "POSTGRES")

    bucket = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "name": t.string(),
            "ideas": t.list(g.ref("idea")),
        },
        name="bucket",
    )
    idea = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "name": t.string(),
            "authorEmail": t.email(),
            "votes": t.list(g.ref("vote")),
            "bucket": g.ref("bucket"),
        },
        name="idea",
    )
    vote = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "authorEmail": t.email(),
            "importance": t.enum(["medium", "important", "critical"]).optional(),
            "desc": t.string().optional(),
            "idea": g.ref("idea"),
        },
        name="vote",
    )

    g.expose(
        pub,
        get_buckets=db.find_many(bucket),
        create_bucket=db.create(bucket),
        get_idea=db.find_many(idea),
        create_idea=db.create(idea),
        get_vote=db.create(vote),
    )
