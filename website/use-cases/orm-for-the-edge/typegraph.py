# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

# skip:end
with TypeGraph(
    "orm-for-the-edge",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    public = policies.public()
    db = PrismaRuntime("legacy", "POSTGRES_CONN")

    user = t.struct(
        {
            "id": t.uuid().config("id", "auto"),
            "email": t.email(),
            "firstname": t.string().max(2000),
        }
    ).named("user")

    g.expose(
        create_user=db.insert_one(user),
        default_policy=[public],
    )
