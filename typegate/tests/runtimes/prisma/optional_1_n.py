from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.providers.prisma import PrismaRuntime


@typegraph()
def prisma(g: Graph):
    db = PrismaRuntime("prisma", "POSTGRES")

    public = Policy.public()

    record = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "name": t.string(),
            "age": t.integer().optional(),
        },
        name="record",
    )

    messages = t.struct(
        {
            "id": t.integer(as_id=True),
            "time": t.integer(),
            "message": t.string(),
            "sender": db.link(t.ref("users").optional(), name="messageSender"),
        },
        name="messages",
    )

    users = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "email": t.string(),
            "name": t.string(),
            "messages": db.link(t.array(t.ref("messages")), "messageSender"),
        },
        name="users",
    )

    g.expose(
        public,
        findManyRecords=db.find_many(record),
        createOneRecord=db.create(record),
        deleteOneRecord=db.delete(record),
        updateOneRecord=db.update(record),
        createUser=db.create(users),
        findUniqueUser=db.find_unique(users),
        findMessages=db.find_many(messages),
        updateUser=db.update(users),
        deleteMessages=db.delete_many(messages),
    )
