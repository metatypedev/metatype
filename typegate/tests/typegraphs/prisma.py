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

    messageSender = db.one_to_many(g("users"), g("messages")).named("messageSender")

    messages = t.struct(
        {
            "id": t.integer().id,
            "time": t.integer(),
            "message": t.string(),
            "sender": messageSender.owner(),
        }
    ).named("messages")

    db.manage(messages)

    users = t.struct(
        {
            "id": t.integer().id,
            "email": t.string(),
            "name": t.string(),
            # "favoriteMessage": db.link(messages),
            "messages": messageSender.owned(),
        }
    ).named("users")

    db.manage(users)

    g.expose(
        **db.gen(
            {
                "queryRaw": (t.struct(), "queryRaw", allow_all),
                "executeRaw": (t.struct(), "executeRaw", allow_all),
                "findManyRecords": (record, "findMany", allow_all),
                "createOneRecord": (record, "create", allow_all),
                "deleteOneRecord": (record, "delete", allow_all),
                "updateOneRecord": (record, "update", allow_all),
                "createUser": (users, "create", allow_all),
                "findUniqueUser": (users, "findUnique", allow_all),
            }
        )
    )
