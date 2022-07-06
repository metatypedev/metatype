from os import environ

from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.prisma import PrismaRuntime
from typegraph.types import typedefs as t

postgres = environ.get(
    "TEST_POSTGRES_DB", "postgresql://postgres:password@localhost:5432/db?schema=test"
)

with TypeGraph("prisma") as g:

    db = PrismaRuntime(postgres)

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
        createOnerecord=db.generate_insert(record).add_policy(allow_all),
        updateOnerecord=db.generate_update(record).add_policy(allow_all),
        deleteOnerecord=db.generate_delete(record).add_policy(allow_all),
        findManyrecord=db.generate_read(record).add_policy(allow_all),
        queryRaw=db.queryRaw().add_policy(allow_all),
        executeRaw=db.executeRaw().add_policy(allow_all),
        createOnemessages=db.generate_insert(messages).add_policy(allow_all),
    )
