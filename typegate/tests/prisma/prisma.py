from typegraph import Effect
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma") as g:

    db = PrismaRuntime("prisma", "POSTGRES")

    allow_all = policies.allow_all()

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
            "DROP SCHEMA IF EXISTS test CASCADE", effect=Effect.delete()
        ).add_policy(allow_all),
        **db.gen(
            {
                "findManyRecords": (record, "findMany", allow_all),
                "createOneRecord": (record, "create", allow_all),
                "deleteOneRecord": (record, "delete", allow_all),
                "updateOneRecord": (record, "update", allow_all),
                "createUser": (users, "create", allow_all),
                "findUniqueUser": (users, "findUnique", allow_all),
                "findMessages": (messages, "findMany", allow_all),
                "updateUser": (users, "update", allow_all),
                "deleteMessages": (messages, "deleteMany", allow_all),
            }
        )
    )
