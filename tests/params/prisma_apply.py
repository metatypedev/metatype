from typegraph import Graph, Policy, t, typegraph
from typegraph.providers import PrismaRuntime


@typegraph()
def prisma_apply(g: Graph):
    prisma = PrismaRuntime("db", "POSTGRES")
    public = Policy.public()

    user = t.struct(
        {
            "id": t.uuid(config=["auto"]).id(),
            "name": t.string(),
            "email": t.email(config=["unique"]),
            "age": t.integer(),
        },
        name="user",
    )

    g.expose(
        public,
        createUser=prisma.create(user).apply(
            {
                "data": {
                    "name": g.as_arg(),
                    "email": g.as_arg(),
                    "age": g.as_arg(),
                }
            }
        ),
        findUser=prisma.find_unique(user).apply(
            {
                "where": {
                    "id": g.as_arg(),
                }
            }
        ),
    )
