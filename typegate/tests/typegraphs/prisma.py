from typegraph import policies
from typegraph.cli import dev
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.prisma import PrismaRuntime
from typegraph.types import typedefs as t

with TypeGraph("prisma") as g:

    db = PrismaRuntime("postgresql://postgres:password@localhost:5432/db")

    allow_all = policies.allow_all()

    record = t.struct(
        {"id": t.uuid().id, "name": t.string(), "age": t.integer().s_optional()}
    ).named("record")

    db.manage(record)

    messages = t.struct(
        {
            "id": t.integer().id,
            "time": t.integer(),
            "message": t.string(),
            "user2": g("users", lambda e: db.link(e)),
        }
    ).named("messages")

    db.manage(messages)

    users = t.struct(
        {
            "id": t.integer().id,
            "email": t.string(),
            "name": t.string(),
            # "favoriteMessage": db.link(messages),
            "messages": db.link(t.list(messages)),
        }
    ).named("users")

    db.manage(users)

    g.expose(
        createOnemessages=db.generate_insert(messages).add_policy(allow_all),
        findManymessages=db.generate_read(messages).add_policy(allow_all),
    )

print(dev.serialize_typegraph(g))
