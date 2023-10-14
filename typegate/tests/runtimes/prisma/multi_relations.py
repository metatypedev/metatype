from typegraph import typegraph, Policy, t, Graph
from typegraph.providers.prisma import PrismaRuntime


@typegraph()
def prisma_multi(g: Graph):
    db = PrismaRuntime("prisma", "POSTGRES")

    public = Policy.public()

    record = t.struct(
        {"id": t.uuid(as_id=True), "name": t.string(), "age": t.integer().optional()},
        name="record",
    )

    messages = t.struct(
        {
            "id": t.integer(as_id=True),
            "time": t.integer(),
            "message": t.string(),
            "sender": db.link("users", "messageSender"),
            "recipient": db.link("users", "messageRecipient"),
        },
        name="messages",
    )

    users = t.struct(
        {
            "id": t.integer(as_id=True),
            "email": t.string(),
            "name": t.string(),
            "sentMessages": db.link(t.array(t.ref("messages")), "messageSender"),
            "receivedMessages": db.link(t.array(t.ref("messages")), "messageRecipient"),
            # "favoriteMessage": favoriteMessage.owned(),  ## optional
        },
        name="users",
    )

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
