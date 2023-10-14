from typegraph import Graph, Policy, t, typegraph
from typegraph.providers.prisma import PrismaRuntime


@typegraph()
def prisma_multi_runtimes(g: Graph):
    db1 = PrismaRuntime("db1", "POSTGRES")
    db2 = PrismaRuntime("db2", "POSTGRES_2")

    user1 = t.struct(
        {
            "id": t.integer(as_id=True, config=["auto"]),
            "name": t.string(),
        },
        name="User1",
    )

    user2 = t.struct(
        {
            "id": t.integer(as_id=True, config=["auto"]),
            "name": t.string(),
        },
        name="User2",
    )

    public = Policy.public()

    g.expose(
        public,
        createUser1=db1.create(user1),
        findUniqueUser1=db1.find_unique(user1),
        findManyUsers1=db1.find_many(user1),
        createUser2=db2.create(user2),
        findUniqueUser2=db2.find_unique(user2),
        findManyUsers2=db2.find_many(user2),
    )
