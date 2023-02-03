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

    messages = t.struct(
        {
            "id": t.integer().config("id"),
            "time": t.integer(),
            "message": t.string(),
            # "sender": g("users", lambda u: u.config(rel="messageSender")),
            "sender": db.link(g("users"), "messageSender"),
        }
    ).named("messages")

    users = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "email": t.string(),
            "name": t.string(),
            # "favoriteMessage": db.link(messages),
            "messages": db.link(t.array(g("messages")), "messageSender"),
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
        .config(rel={"messageSender": "messages"})
        .named("users")
    )

    g.expose(
        dropSchema=db.executeRaw(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ).add_policy(public),
        findManyRecords=db.find_many(record).add_policy(public),
        createoneRecord=db.create(record).add_policy(public),
        deleteOneRecord=db.delete(record).add_policy(public),
        updateOneRecord=db.update(record).add_policy(public),
        createUser=db.create(users).add_policy(public),
        findUniqueUser=db.find_unique(users).add_policy(public),
        findMessages=db.find_many(messages).add_policy(public),
        updateUser=db.update(users).add_policy(public),
        deleteMessages=db.delete_many(messages).add_policy(public),
    )
