# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

# skip:end
# highlight-next-line

with TypeGraph(
    "database",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    db = PrismaRuntime("database", "POSTGRES_CONN")
    public = policies.public()

    message = t.struct(
        {
            # highlight-next-line
            "id": t.integer().config("id", "auto"),  # 2
            "title": t.string(),
            "user_id": t.integer(),
        }
        # highlight-next-line
    ).named(  # 3
        "message"
    )
    db.manage(message)  # soon removed

    g.expose(
        # highlight-next-line
        create_message=db.insert_one(message),  # 4
        list_messages=db.find_many(message),
        default_policy=[public],
    )
