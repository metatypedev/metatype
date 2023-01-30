from typegraph import Effect
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime


with TypeGraph("prisma") as g:

    db = PrismaRuntime("prisma", "POSTGRES")

    public = policies.public()

    record = t.struct(
        {"id": t.uuid().config("id"), "name": t.string(), "age": t.integer().optional()}
    ).named("record")

    db.__manage(record)

    messageSender = db.one_to_many(g("users"), g("messages")).named("messageSender")
    messageRecipient = db.one_to_many(g("users"), g("messages")).named(
        "messageRecipient"
    )
    # favoriteMessage = db.one_to_one(g("users"), g("messages")).named("favoriteMessage")

    messages = t.struct(
        {
            "id": t.integer().config("id"),
            "time": t.integer(),
            "message": t.string(),
            "sender": messageSender.owner(),
            "recipient": messageRecipient.owner(),
        }
    ).named("messages")

    db.__manage(messages)

    users = t.struct(
        {
            "id": t.integer().config("id"),
            "email": t.string(),
            "name": t.string(),
            "sentMessages": messageSender.owned(),
            "receivedMessages": messageRecipient.owned(),
            # "favoriteMessage": favoriteMessage.owned(),  ## optional
        }
    ).named("users")

    db.__manage(users)

    g.expose(
        dropSchema=db.executeRaw(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=Effect.delete()
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
