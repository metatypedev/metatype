# skip:start
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

# skip:end

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
            "id": t.integer().config("id", "auto"),  # 1
            "title": t.string(),
            "user_id": t.integer(),
        }
        # highlight-next-line
    ).named(  # 2
        "message"
    )
    db.manage(message)  # soon removed

    g.expose(
        # highlight-next-line
        create_message=db.insert_one(message),  # 3
        list_messages=db.find_many(message),
        default_policy=[public],
    )
