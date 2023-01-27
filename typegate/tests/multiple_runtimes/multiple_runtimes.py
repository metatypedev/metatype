from typegraph import Effect
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph(name="prisma") as g:
    db1 = PrismaRuntime("db1", "POSTGRES")
    db2 = PrismaRuntime("db2", "POSTGRES_2")

    user1 = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "name": t.string(),
        }
    ).named("test1_User")

    user2 = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "name": t.string(),
        }
    ).named("test2_User")

    db1.manage(user1)
    db2.manage(user2)

    allow_all = policies.allow_all()

    g.expose(
        dropSchema1=db1.executeRaw(
            "DROP SCHEMA IF EXISTS test1 CASCADE",
            effect=Effect.delete(idempotent=True),
        ).add_policy(allow_all),
        dropSchema2=db2.executeRaw(
            "DROP SCHEMA IF EXISTS test2 CASCADE", effect=Effect.delete(idempotent=True)
        ).add_policy(allow_all),
        **db1.gen(
            {
                "createUser1": (user1, "create", allow_all),
                "findUniqueUser1": (user1, "findUnique", allow_all),
                "findManyUsers1": (user1, "findMany", allow_all),
            }
        ),
        **db2.gen(
            {
                "createUser2": (user2, "create", allow_all),
                "findUniqueUser2": (user2, "findUnique", allow_all),
                "findManyUsers2": (user2, "findMany", allow_all),
            }
        )
    )
