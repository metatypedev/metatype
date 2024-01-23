from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime
from typegraph.graph.params import Auth
from typegraph.providers.prisma import PrismaRuntime
from typegraph.graph.params import Cors


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    name="roadmap-rest",
    # skip:end
)
def roadmap(g: Graph):
    pub = Policy.public()
    db = PrismaRuntime("db", "POSTGRES")
    deno = DenoRuntime()

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

    g.auth(Auth.basic(["andim"]))

    admins = deno.policy(
        "admins",
        "(_args, { context }) => !!context.username",
    )

    g.expose(
        pub,
        create_bucket=db.create(bucket).with_policy(admins),
        get_buckets=db.find_many(bucket),
        get_bucket=db.find_first(bucket),
        get_idea=db.find_many(idea),
        create_idea=db.create(idea).reduce(
            {
                "data": {
                    "name": g.inherit(),
                    "authorEmail": g.inherit(),
                    "votes": g.inherit(),
                    "bucket": {"connect": g.inherit()},
                }
            }
        ),
        create_vote=db.create(vote),
    )

    g.rest(
        """
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
        """
    )

    g.rest(
        """
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
        """
    )
