# skip:start
from typegraph import TypeGraph, policies, t

# isort: off
# skip:end
# highlight-next-line
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph(
    "database",
    # skip:next-line
    cors=TypeGraph.Cors(
        allow_origin=["https://metatype.dev", "http://localhost:3000"],
        allow_headers=["content-type"],
    ),
) as g:
    db = PrismaRuntime("database", "POSTGRES_CONN")
    public = policies.public()

    message = t.struct(
        {
            # highlight-next-line
            "id": t.integer().as_id.config("auto"),
            "title": t.string(),
            "body": t.string(),
        }
        # highlight-next-line
    ).named("message")

    g.expose(
        # highlight-next-line
        create_message=db.create(message),
        list_messages=db.find_many(message),
        default_policy=[public],
    )
