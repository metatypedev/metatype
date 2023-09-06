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
        name="Record",
    )

    # messages = t.struct(
    #     {
    #         "id": t.integer().as_id,
    #         "time": t.integer(),
    #         "message": t.string(),
    #         "sender": db.link(g("users"), "messageSender"),
    #     }
    # ).named("messages")
    #
    # users = t.struct(
    #     {
    #         "id": t.integer().as_id.config("auto"),
    #         "email": t.string(),
    #         "name": t.string(),
    #         "messages": db.link(t.array(g("messages")), "messageSender"),
    #     }
    # ).named("users")

    g.expose(
        public,
        findRecord=db.find_unique(record),
        findManyRecords=db.find_many(record),
        createOneRecord=db.create(record),
        deleteOneRecord=db.delete(record),
        updateOneRecord=db.update(record),
        # createUser=db.create(users),
        # findUniqueUser=db.find_unique(users),
        # findMessages=db.find_many(messages),
        # updateUser=db.update(users),
        # deleteMessages=db.delete_many(messages),
    )
