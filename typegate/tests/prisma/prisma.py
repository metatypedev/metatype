from typegraph import effects
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma") as g:

    db = PrismaRuntime("prisma", "POSTGRES")

    public = policies.public()

    record = t.struct(
        {
            "id": t.uuid().config("id", "auto"),
            "name": t.string(),
            "age": t.integer().optional(),
        },
    ).named("record")

    db.manage(record)

    messageSender = db.one_to_many(g("users"), g("messages")).named("messageSender")

    messages = t.struct(
        {
            "id": t.integer().config("id"),
            "time": t.integer(),
            "message": t.string(),
            "sender": messageSender.owner(),
        }
    ).named("messages")

    db.manage(messages)

    users = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "email": t.string(),
            "name": t.string(),
            # "favoriteMessage": db.link(messages),
            "messages": messageSender.owned(),
        }
    ).named("users")

    db.manage(users)

    g.expose(
        dropSchema=db.executeRaw(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ).add_policy(public),
        **db.gen(
            {
                "findManyRecords": (record, "findMany", public),
                "createOneRecord": (record, "create", public),
                "deleteOneRecord": (record, "delete", public),
                "updateOneRecord": (record, "update", public),
                "createUser": (users, "create", public),
                "findUniqueUser": (users, "findUnique", public),
                "findMessages": (messages, "findMany", public),
                "updateUser": (users, "update", public),
                "deleteMessages": (messages, "deleteMany", public),
            }
        )
    )
