from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.prisma import PrismaRuntime
from typegraph.types import typedefs as t

with TypeGraph(name="prisma2") as g:
    db1 = PrismaRuntime("postgresql://postgres:password@localhost:5432/db?schema=test1")
    db2 = PrismaRuntime("postgresql://postgres:password@localhost:5432/db?schema=test2")

    user1 = t.struct(
        {
            "id": t.integer().id.auto,
            "name": t.string(),
        }
    ).named("test1_User")

    user2 = t.struct(
        {
            "id": t.integer().id.auto,
            "name": t.string(),
        }
    ).named("test2_User")

    db1.manage(user1)
    db2.manage(user2)

    allow_all = policies.allow_all()

    g.expose(
        **db1.gen(
            {
                "executeRaw": (t.struct(), "executeRaw", allow_all),
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
