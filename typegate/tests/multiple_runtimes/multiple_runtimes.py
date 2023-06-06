from typegraph import TypeGraph, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph(name="prisma") as g:
    db1 = PrismaRuntime("db1", "POSTGRES")
    db2 = PrismaRuntime("db2", "POSTGRES_2")

    user1 = t.struct(
        {
            "id": t.integer().id().config("auto"),
            "name": t.string(),
        }
    ).named("test1_User")

    user2 = t.struct(
        {
            "id": t.integer().id().config("auto"),
            "name": t.string(),
        }
    ).named("test2_User")

    public = policies.public()

    g.expose(
        createUser1=db1.create(user1),
        findUniqueUser1=db1.find_unique(user1),
        findManyUsers1=db1.find_many(user1),
        createUser2=db2.create(user2),
        findUniqueUser2=db2.find_unique(user2),
        findManyUsers2=db2.find_many(user2),
        default_policy=public,
    )
