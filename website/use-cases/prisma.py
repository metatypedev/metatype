# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

# skip:end
with TypeGraph(
    "prisma-runtime",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    public = policies.public()
    db = PrismaRuntime("legacy", "POSTGRES_CONN")

    user = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "email": t.email(),
            "firstname": t.string().min(2).max(2000),
        }
    ).named("user")

    g.expose(
        create_user=db.create(user),
        read_user=db.find_many(user),
        default_policy=[public],
    )
