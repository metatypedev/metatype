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

    public = policies.public()

    g.expose(
        **db1.gen(
            {
                "executeRaw": (t.struct(), "executeRaw", public),
                "createUser1": (user1, "create", public),
                "findUniqueUser1": (user1, "findUnique", public),
                "findManyUsers1": (user1, "findMany", public),
            }
        ),
        **db2.gen(
            {
                "createUser2": (user2, "create", public),
                "findUniqueUser2": (user2, "findUnique", public),
                "findManyUsers2": (user2, "findMany", public),
            }
        )
    )
