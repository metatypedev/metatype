from typegraph import TypeGraph, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma") as g:
    db = PrismaRuntime("prisma", "POSTGRES")

    public = policies.public()

    record = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "name": t.string(),
            "age": t.integer().optional(),
        },
    ).named("record")

    messages = t.struct(
        {
            "id": t.integer().as_id,
            "time": t.integer(),
            "message": t.string(),
            "sender": db.link(g("users"), "messageSender"),
        }
    ).named("messages")

    users = t.struct(
        {
            "id": t.integer().as_id.config("auto"),
            "email": t.string(),
            "name": t.string(),
            "messages": db.link(t.array(g("messages")), "messageSender"),
        }
    ).named("users")

    g.expose(
        findManyRecords=db.find_many(record),
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
