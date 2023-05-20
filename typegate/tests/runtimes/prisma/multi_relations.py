from typegraph import TypeGraph, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma_multi") as g:
    db = PrismaRuntime("prisma", "POSTGRES")

    public = policies.public()

    record = t.struct(
        {"id": t.uuid().config("id"), "name": t.string(), "age": t.integer().optional()}
    ).named("record")

    messages = t.struct(
        {
            "id": t.integer().config("id"),
            "time": t.integer(),
            "message": t.string(),
            "sender": db.link(g("users"), "messageSender"),
            "recipient": db.link(g("users"), "messageRecipient"),
        }
    ).named("messages")

    users = t.struct(
        {
            "id": t.integer().config("id"),
            "email": t.string(),
            "name": t.string(),
            "sentMessages": db.link(t.array(g("messages")), "messageSender"),
            "receivedMessages": db.link(t.array(g("messages")), "messageRecipient"),
            # "favoriteMessage": favoriteMessage.owned(),  ## optional
        }
    ).named("users")

    g.expose(
        findManyRecors=db.find_many(record),
        createOneRecord=db.create(record),
        deleteOneRecord=db.delete(record),
        updateOneRecord=db.update(record),
        createUser=db.create(users),
        findUniqueUser=db.find_unique(users),
        findMessages=db.find_many(messages),
        updateUser=db.update(users),
        deleteMessages=db.delete_many(messages),
        default_policy=public,
    )
